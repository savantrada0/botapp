// app.js
const express = require("express");
const { App } = require("@slack/bolt");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(express.json());

const slackApp = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

slackApp.command("/approval-test", async ({ command, ack, client }) => {
  await ack();
  try {
    const result = await client.views.open({
      trigger_id: command.trigger_id,
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
              multiline: true,
              action_id: "approval_text",
            },
            label: {
              type: "plain_text",
              text: "Approval Text",
            },
          },
        ],
        submit: {
          type: "plain_text",
          text: "Submit",
        },
      },
    });
  } catch (error) {
    console.error(error);
  }
});

slackApp.view("approval_modal", async ({ ack, body, view, client }) => {
  await ack();
  const approver = view.state.values.approver_block.approver.selected_user;
  const approvalText =
    view.state.values.approval_text_block.approval_text.value;
  const requester = body.user.id;

  try {
    await client.chat.postMessage({
      channel: approver,
      text: `You have a new approval request from <@${requester}>: ${approvalText}`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `You have a new approval request from <@${requester}>: ${approvalText}`,
          },
        },
        {
          type: "actions",
          block_id: "approval_actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Approve",
              },
              style: "primary",
              action_id: "approve",
            },
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Reject",
              },
              style: "danger",
              action_id: "reject",
            },
          ],
        },
      ],
    });
  } catch (error) {
    console.error(error);
  }
});

slackApp.action(
  { block_id: "approval_actions", action_id: "approve" },
  async ({ body, ack, client }) => {
    await ack();
    const requester = body.message.text.match(/<@(.*?)>/)[1];

    try {
      await client.chat.postMessage({
        channel: requester,
        text: "Your approval request has been approved.",
      });
    } catch (error) {
      console.error(error);
    }
  }
);

slackApp.action(
  { block_id: "approval_actions", action_id: "reject" },
  async ({ body, ack, client }) => {
    await ack();
    const requester = body.message.text.match(/<@(.*?)>/)[1];

    try {
      await client.chat.postMessage({
        channel: requester,
        text: "Your approval request has been rejected.",
      });
    } catch (error) {
      console.error(error);
    }
  }
);

(async () => {
  await slackApp.start(process.env.PORT);
  console.log("⚡️ Slack Bolt app is running!");
})();
