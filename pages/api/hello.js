// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { execSync } from "child_process";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
let payload = "";

export default async function handler(req, res) {
  const { response_url, text, channel_name: courseName } = req.body;

  res.status(200).send();
  initializeTempDirectory();

  try {
    cloneReop("git@github.com:neuefische/web-curriculum-new-format.git");

    const [command, ...args] = text.trim().split(" ");

    switch (command) {
      case "list": {
        payload += listSessions();
        break;
      }
      case "copy": {
        const [sessionName] = args;
        cloneReop(`git@github.com:shebtastic/${courseName}.git`);
        payload += copySession(sessionName, courseName);
        break;
      }
    }

    const response = await fetch(response_url, {
      method: "POST",
      body: JSON.stringify({ text: payload, mrkdwn: true }),
    });

    console.log(response);
  } finally {
    deleteTempDirectory();
  }

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
    return ls.toString();
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
}
