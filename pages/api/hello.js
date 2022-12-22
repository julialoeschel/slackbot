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
        cloneReop("git@github.com:neuefische/web-curriculum-new-format.git");

        const [sessionName] = args;
        const allSessions = listSessions();

        if (!allSessions.includes(sessionName)) {
          throw new Error(`session ${sessionName} does not exist`);
        }

        cloneReop(`git@github.com:shebtastic/${courseName}.git`);
        payload += copySession(sessionName, courseName);
        break;
      }
    }
  } catch (error) {
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

  async function cloneReop(path, cwd = "tmp") {
    execSync(`git clone ${path}`, { cwd });
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

  function copySession(
    sessionName,
    targetRepo,
    sourceRepo = "web-curriculum-new-format"
  ) {
    const cp = execSync(
      `cp -r ${sourceRepo}/sessions/${sessionName} ${targetRepo}/sessions/.`,
      {
        cwd: `tmp`,
      }
    );

    const push = execSync(
      `git add .; git commit -m "add ${sessionName}" ; git push  `,
      {
        cwd: `tmp/${targetRepo}`,
      }
    );
    return `added *${sessionName}*`;
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
