// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { execSync } from "child_process";
import { Octokit } from "octokit";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const octokit = new Octokit({ auth: GITHUB_TOKEN });
let payload = "";

export default async function handler(req, res) {
  const { response_url, text, channel_name: courseName } = req.body;
  const sendResponse = createSendResponse(response_url);

  res.status(200).send();

  initializeTempDirectory();

  try {
    const [command, ...args] = text.trim().split(" ");

    switch (command) {
      case "list": {
        const response = await listSessions();
        payload += response.map((session) => `${session}\n`).join("");
        break;
      }
      case "copy": {
        const [sessionName] = args;
        const allSessions = await listSessions();

        if (!allSessions.includes(sessionName)) {
          throw new Error(`session ${sessionName} does not exist`);
        }
        const paths = ["sessions/react-state/README.md"];
        for (const path of paths) {
          const file = await donloadFile(path);
          const { status } = await uploadFile(path, file, courseName);
          if (status === 201) {
            payload += `that worked. ${path}\n `;
          } else {
            payload += `no!!! idnt work. ${path}\n `;
            throw new Error(` upload of ${path} didnt  work`);
          }
        }
        break;
      }
    }
  } catch (error) {
    console.error(error);
    await sendResponse(error.message);

    return;
  } finally {
    deleteTempDirectory();
  }

  await sendResponse(payload);

  ///////////////////////
  //functions
  function initializeTempDirectory() {
    execSync("mkdir -p tmp");
  }

  function deleteTempDirectory() {
    execSync("rm -rf tmp");
  }

  async function donloadFile(path, cwd = "tmp") {
    const res = await octokit.request(
      "GET /repos/{owner}/{repo}/contents/{path}{?ref}",
      {
        owner: "neuefische",
        repo: "web-curriculum-new-format",
        path,
      }
    );

    return res.data.content;
  }

  async function listSessions() {
    const {
      data: { tree },
    } = await octokit.request(
      "GET /repos/{owner}/{repo}/git/trees/{tree_sha}{?recursive}",
      {
        owner: "neuefische",
        repo: "web-curriculum-new-format",
        tree_sha: "main",
        recursive: true,
      }
    );
    return Array.from(
      tree
        .map((leaf) => leaf.path)
        .filter((path) => path.startsWith("sessions/"))
        .map((path) => path.replace(/sessions\/(.+?)\/.*/, "$1"))
        .filter((path) => !path.startsWith("sessions/"))
        .filter((path) => !path.startsWith("_"))
        .reduce((acc, curr) => acc.add(curr), new Set())
    );
  }

  async function uploadFile(path, content, targetRepo) {
    const response = await octokit.request(
      "PUT /repos/{owner}/{repo}/contents/{path}",
      {
        owner: "shebtastic",
        repo: targetRepo,
        path,
        message: `add ${path}`,
        committer: {
          name: "Klaus the Slackbot",
          email: "julia.loeschel@neuefische.de",
        },
        content,
      }
    );

    return response;
  }

  function createSendResponse(response_url) {
    return async function (text) {
      return await fetch(response_url, {
        method: "POST",
        body: JSON.stringify({ text, mrkdwn: true }),
      });
    };
  }
}
