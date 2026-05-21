#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const MONDAY_API_TOKEN = process.env.MONDAY_API_TOKEN || process.env.MONDAY_API_KEY;
if (!MONDAY_API_TOKEN) {
  console.error('Missing MONDAY_API_TOKEN (or MONDAY_API_KEY) env var.');
  process.exit(1);
}

const MONDAY_ENDPOINT = 'https://api.monday.com/v2';
const API_VERSION = '2024-10';
const BOARD_ID = '5891626711';

async function monday(query, variables = {}) {
  const res = await fetch(MONDAY_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'API-Version': API_VERSION,
      Authorization: MONDAY_API_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) {
    console.error('Monday GraphQL error:', JSON.stringify(json.errors, null, 2));
    throw new Error('Monday GraphQL request failed');
  }
  return json.data;
}

async function createColumn(title, columnType, description, settingsStr) {
  const variables = {
    boardId: String(BOARD_ID),
    title,
    type: columnType,
    description,
    ...(settingsStr ? { settings: settingsStr } : {}),
  };
  const settingsArg = settingsStr ? ', defaults: $settings' : '';
  const settingsVar = settingsStr ? ', $settings: JSON' : '';
  const query = `
    mutation($boardId: ID!, $title: String!, $type: ColumnType!, $description: String${settingsVar}) {
      create_column(
        board_id: $boardId,
        title: $title,
        column_type: $type,
        description: $description${settingsArg}
      ) {
        id
        title
        type
      }
    }
  `;
  const data = await monday(query, variables);
  console.log(`  ✓ "${title}" (${columnType}) → id=${data.create_column.id}`);
  return data.create_column.id;
}

async function main() {
  const out = { boardId: BOARD_ID };

  console.log('Adding date milestone columns…');
  out.dateFirstQualified = await createColumn(
    'Date First Qualified',
    'date',
    'When lead passed qualification — set once, never overwritten'
  );
  out.dateBecameCustomer = await createColumn(
    'Date Became Customer',
    'date',
    'When lead first converted to customer'
  );

  console.log('\nAdding activity tracking columns…');
  out.emailsSent = await createColumn(
    'Emails Sent',
    'numbers',
    'Running count of outbound emails — n8n increments'
  );
  out.wasNoShowed = await createColumn(
    'Was No Showed',
    'checkbox',
    'True if lead was ever a no-show'
  );

  console.log('\nAdding WhatsApp tracking columns…');
  const waStatusLabels = [
    { label: 'Sent',        color: 0 },
    { label: 'Replied',     color: 1 },
    { label: 'Engaged',     color: 2 },
    { label: 'Booked',      color: 6 },
    { label: 'No Response', color: 5 },
  ];
  out.waStatus = await createColumn(
    'WA Status',
    'status',
    'WhatsApp conversation state',
    JSON.stringify({
      labels: waStatusLabels.map((l, i) => ({
        id: i + 1,
        label: l.label,
        color: l.color,
        index: i,
      })),
    })
  );
  out.waFirstSent = await createColumn(
    'WA First Sent',
    'date',
    'When the first WhatsApp was sent'
  );
  out.waLastReply = await createColumn(
    'WA Last Reply',
    'date',
    'When lead last replied via WhatsApp'
  );
  out.waMessagesSent = await createColumn(
    'WA Messages Sent',
    'numbers',
    'Outbound WhatsApp message count'
  );
  out.waReplies = await createColumn(
    'WA Replies',
    'numbers',
    'Lead reply count via WhatsApp'
  );
  out.waTemplateUsed = await createColumn(
    'WA Template Used',
    'text',
    'Which WhatsApp template was sent'
  );
  out.waConversation = await createColumn(
    'WA Conversation',
    'long_text',
    'Full conversation JSON (last 10 messages)'
  );
  out.waCompleted = await createColumn(
    'WA Completed',
    'checkbox',
    'Marks conversation done'
  );

  const outPath = path.join(__dirname, 'new-column-ids.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`\nWrote ${outPath}`);
  console.log(JSON.stringify(out, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
