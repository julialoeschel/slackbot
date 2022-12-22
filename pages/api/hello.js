// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { execSync } from "child_process";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
let payload = "";

export default async function handler(req, res) {
  const { response_url, text, channel_name: courseName } = req.body;
  const sendResponse = createSendResponse(response_url);

  res.status(200).send();
  initializeTempDirectory();

  try {
    cloneReop("git@github.com:neuefische/web-curriculum-new-format.git");

    const [command, ...args] = text.trim().split(" ");

    switch (command) {
      case "list": {
        payload += listSessions()
          .map((session) => `${session}\n`)
          .join("");
        break;
      }
      case "copy": {
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

  function cloneReop(path, cwd = "tmp") {
    execSync(`git clone ${path}`, { cwd });
  }

  function listSessions() {
    const ls = execSync("ls", {
      cwd: "tmp/web-curriculum-new-format/sessions",
    });
    return ls
      .toString()
      .split("\n")
      .slice(0, -1)
      .filter((session) => !session.startsWith("_"));
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
