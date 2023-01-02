// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { Octokit } from "octokit";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const octokit = new Octokit({ auth: GITHUB_TOKEN });
let payload = "";

export default async function handler(req, res) {
  const { response_url, text, channel_name: courseName } = req.body;
  const sendResponse = createSendResponse(response_url);

  res.status(200).send();

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
        const paths = await fileOfSession(sessionName);
        for (const path of paths) {
          if (isInStopWords(path)) continue;

          const file = await donloadFile(path);
          const { status } = await uploadFile(path, file, courseName);
          if (status === 201) {
            payload += `that worked. ${path}\n `;
          } else {
            payload += `no!!! idnt work. ${path}\n `;
            throw new Error(` upload of ${path} didnt  work`);
          }
        }
        await sendResponse(
          `:nintendo_star:  Session:  *${sessionName} :nintendo_star:*
:books: <https://github.com/shebtastic/${courseName}/tree/main/sessions/${sessionName}| handout & challenges> :books: `,
          true
        );
        await sendResponse(
          `:question_block: Fragen-Thread :question_block:`,
          true
        );
        break;
      }
    }
  } catch (error) {
    await sendResponse(error.message, false);
    return;
  }

  await sendResponse(payload, false);

  ///////////////////////
  //functions

  async function donloadFile(path) {
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

  async function fileOfSession(sessionName) {
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
        .filter((node) => node.type === "blob")
        .map((leaf) => leaf.path)
        .filter((path) => path.startsWith(`sessions/${sessionName}/`))
    );
  }

  function createSendResponse(response_url) {
    return async function (text, isPublic) {
      return await fetch(response_url, {
        method: "POST",
        body: JSON.stringify({
          response_type: isPublic ? "in_channel" : "ephemeral",
          text,
          mrkdwn: true,
        }),
      });
    };
  }

  function isInStopWords(path) {
    const stopwords = [
      "README.md",
      "quiz.md",
      "missconceptions.md",
      "rationale.md",
    ];
    return stopwords.some((stopword) =>
      path.toLowerCase().includes(stopword.toLowerCase())
    );
  }
}
