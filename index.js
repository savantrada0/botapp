const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
require("dotenv").config();

const app = express();
const port = process.env.PORT;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET;

// Verify Slack request
const verifySlackRequest = (req, res, next) => {
  // Verification logic here
  next();
};

// Slash command endpoint
app.post("/slack/commands", verifySlackRequest, (req, res) => {
  const { trigger_id } = req.body;

  const modal = {
    trigger_id: trigger_id,
    view: {
      type: "modal",
      callback_id: "approval_modal",
      title: {
        type: "plain_text",
        text: "Request Approval",
      },
      blocks: [
        {
          type: "input",
          block_id: "approver_block",
          element: {
            type: "users_select",
            action_id: "approver_action",
            placeholder: {
              type: "plain_text",
              text: "Select an approver",
            },
          },
          label: {
            type: "plain_text",
            text: "Approver",
          },
        },
        {
          type: "input",
          block_id: "approval_text_block",
          element: {
            type: "plain_text_input",
            action_id: "approval_text_action",
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
  };

  axios.post("https://slack.com/api/views.open", modal, {
    headers: {
      Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
  });

  res.send("");
});

// Interaction endpoint
app.post("/slack/interactions", verifySlackRequest, (req, res) => {
  const payload = JSON.parse(req.body.payload);
  const { type, user, view, actions } = payload;

  if (type === "block_actions" && actions[0].action_id === "submit_approval") {
    const approver =
      view.state.values.approver_block.approver_action.selected_user;
    const approvalText =
      view.state.values.approval_text_block.approval_text_action.value;

    const message = {
      channel: approver,
      text: `You have a new approval request from <@${user.id}>`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Approval Request*\n\n${approvalText}`,
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
    };

    axios.post("https://slack.com/api/chat.postMessage", message, {
      headers: {
        Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    res.send("");
  }

  if (
    type === "block_actions" &&
    (actions[0].action_id === "approve_request" ||
      actions[0].action_id === "reject_request")
  ) {
    const requester = payload.message.blocks[0].text.text.match(/<@(.*?)>/)[1];
    const action =
      actions[0].action_id === "approve_request" ? "approved" : "rejected";

    const message = {
      channel: requester,
      text: `Your approval request has been ${action} by <@${user.id}>.`,
    };

    axios.post("https://slack.com/api/chat.postMessage", message, {
      headers: {
        Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    res.send("");
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
