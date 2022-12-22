// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { execSync } from "child_process";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
let payload = "";

export default async function handler(req, res) {
  const { response_url, text, channel_name } = req.body;

  res.status(200).send();
  execSync("mkdir -p tmp");

  const newFormatClone = execSync(
    "git clone git@github.com:neuefische/web-curriculum-new-format.git",
    { cwd: "tmp" }
  );

  const testClone = execSync(
    `git clone git@github.com:shebtastic/${channel_name}.git`,
    { cwd: "tmp" }
  );

  ///code goes here

  if (text === "?list") {
    const ls = execSync("ls", {
      cwd: "tmp/web-curriculum-new-format/sessions",
    });
    payload += ls.toString();
  } else {
    const args = text.split(" ");
    if (args[0] === "copy") {
      const cp = execSync(
        `cp -r web-curriculum-new-format/sessions/${args[1]} ${channel_name}/sessions/.`,
        {
          cwd: `tmp`,
        }
      );
      const push = execSync(
        `git add .; git commit -m "add ${args[1]}" ; git push  `,
        {
          cwd: `tmp/${channel_name}`,
        }
      );
      payload += `added *${args[1]}*`;
    } else {
      payload = "hallo";
    }
  }

  const response = await fetch(response_url, {
    method: "POST",
    body: JSON.stringify({ text: payload, mrkdwn: true }),
  });

  console.log(response);

  ///

  execSync("rm -rf tmp");
}
