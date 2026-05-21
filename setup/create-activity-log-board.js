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

const EVENT_TYPE_OPTIONS = [
  'Status Changed',
  'WhatsApp Sent',
  'WhatsApp Replied',
  'Email Sent',
  'Call Made',
  'Call Answered',
  'Meeting Booked',
  'Meeting No Show',
  'Meeting Rebooked',
  'Offer Applied',
  'Customer Converted',
  'Sequence Started',
  'Sequence Ended',
  'Manual',
];

const SOURCE_OPTIONS = ['n8n', 'Zapier', 'Calendly', 'Monday', 'Vercel', 'Manual'];

function dropdownSettings(labels) {
  return JSON.stringify({
    labels: labels.map((label, i) => ({ id: i + 1, name: label })),
  });
}

async function createBoard() {
  console.log('Creating Activity Log board…');
  const data = await monday(`
    mutation {
      create_board(board_name: "Stayful Activity Log", board_kind: public) {
        id
        name
      }
    }
  `);
  const board = data.create_board;
  console.log(`  ✓ Board created: ${board.name} (id=${board.id})`);
  return board.id;
}

async function createColumn(boardId, title, columnType, settingsStr) {
  const variables = {
    boardId: String(boardId),
    title,
    type: columnType,
    ...(settingsStr ? { settings: settingsStr } : {}),
  };
  const settingsArg = settingsStr ? ', defaults: $settings' : '';
  const settingsVar = settingsStr ? ', $settings: JSON' : '';
  const query = `
    mutation($boardId: ID!, $title: String!, $type: ColumnType!${settingsVar}) {
      create_column(board_id: $boardId, title: $title, column_type: $type${settingsArg}) {
        id
        title
        type
      }
    }
  `;
  const data = await monday(query, variables);
  console.log(`  ✓ Column "${title}" (${columnType}) → id=${data.create_column.id}`);
  return data.create_column.id;
}

async function main() {
  const boardId = await createBoard();

  const columns = {};
  columns.leadName = await createColumn(boardId, 'Lead Name', 'text');
  columns.leadId = await createColumn(boardId, 'Lead ID', 'numbers');
  columns.eventType = await createColumn(
    boardId,
    'Event Type',
    'dropdown',
    dropdownSettings(EVENT_TYPE_OPTIONS)
  );
  columns.from = await createColumn(boardId, 'From', 'text');
  columns.to = await createColumn(boardId, 'To', 'text');
  columns.timestamp = await createColumn(boardId, 'Timestamp', 'date');
  columns.source = await createColumn(
    boardId,
    'Source',
    'dropdown',
    dropdownSettings(SOURCE_OPTIONS)
  );
  columns.notes = await createColumn(boardId, 'Notes', 'long_text');

  const output = { boardId, columns };
  const outPath = path.join(__dirname, 'activity-log-column-ids.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\nWrote ${outPath}`);
  console.log(JSON.stringify(output, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
