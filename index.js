// index.js
const express = require("express");
const { App } = require("@slack/bolt");
const bodyParser = require("body-parser");
require("dotenv").config();

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const slackApp = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

app.post("/slack/commands", async (req, res) => {
  const { command, text, user_id, trigger_id } = req.body;

  if (command === "/approval-test") {
    try {
      await slackApp.client.views.open({
        trigger_id,
        view: {
          type: "modal",
          callback_id: "approval_modal",
          title: {
            type: "plain_text",
            text: "Approval Request",
          },
          blocks: [
            {
              type: "input",
              block_id: "approver_block",
              element: {
                type: "users_select",
                action_id: "approver",
              },
              label: {
                type: "plain_text",
                text: "Select Approver",
              },
            },
            {
              type: "input",
              block_id: "approval_text_block",
              element: {
                type: "plain_text_input",
                action_id: "approval_text",
                multiline: true,
              },
              label: {
                type: "plain_text",
                text: "Approval Text",
              },
            },
            {
              type: "actions",
              elements: [
                {
                  type: "button",
                  text: {
                    type: "plain_text",
                    text: "Submit",
                  },
                  action_id: "submit_approval",
                },
              ],
            },
          ],
        },
      });
      res.status(200).send("");
    } catch (error) {
      console.error(error);
      res.status(500).send("Something went wrong");
    }
  }
});

slackApp.action("submit_approval", async ({ ack, body, client }) => {
  await ack();
  const approver = body.view.state.values.approver_block.approver.selected_user;
  const approvalText =
    body.view.state.values.approval_text_block.approval_text.value;

  try {
    await client.chat.postMessage({
      channel: approver,
      text: `You have a new approval request from <@${body.user.id}>: ${approvalText}`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `You have a new approval request from <@${body.user.id}>:\n${approvalText}`,
          },
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Approve",
              },
              style: "primary",
              action_id: "approve_request",
            },
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Reject",
              },
              style: "danger",
              action_id: "reject_request",
            },
          ],
        },
      ],
    });
  } catch (error) {
    console.error(error);
  }
});

slackApp.action("approve_request", async ({ ack, body, client }) => {
  await ack();
  const requester = body.message.blocks[0].text.text.match(/<@(\w+)>/)[1];

  try {
    await client.chat.postMessage({
      channel: requester,
      text: `Your approval request has been approved by <@${body.user.id}>.`,
    });
  } catch (error) {
    console.error(error);
  }
});

slackApp.action("reject_request", async ({ ack, body, client }) => {
  await ack();
  const requester = body.message.blocks[0].text.text.match(/<@(\w+)>/)[1];

  try {
    await client.chat.postMessage({
      channel: requester,
      text: `Your approval request has been rejected by <@${body.user.id}>.`,
    });
  } catch (error) {
    console.error(error);
  }
});

(async () => {
  await slackApp.start(process.env.PORT);
  console.log("Slack bot is running");
})();

app.listen(3000, () => {
  console.log("Express server is running on port 3000");
});
