import fetch from 'node-fetch';

import { create } from 'ipfs-http-client';

const ipfs = create(`http://127.0.0.1:5001`, {
  protocol: 'http',
});

async function getTransactions(cursor) {
  const query = `
    query {
      transactions(
        tags: [
          {
            name: "Content-Type",
            values: ["application/json"]
          },
          {
            name: "Protocol",
            values: ["Portrait"]
          }
        ],
        first: 50,
        after: "${cursor}"
      ) {
        edges {
          cursor
          node {
            id
            tags {
              name
              value
            }
          }
        }
      }
    }
  `;

  console.log(`Sending GraphQL query with cursor: ${cursor}`);

  const response = await fetch('https://arweave-search.goldsky.com/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });

  return response.json();
}

async function main() {
  let cursor = null;

  while (true) {
    const result = await getTransactions(cursor);
    const edges = result.data.transactions.edges;

    if (edges.length === 0) {
      console.log('No more transactions found, ending app');
      break;
    }

    console.log(`Retrieved ${edges.length} transactions`);

    for (const edge of edges) {
      const transactionId = edge.node.id;
      const tags = edge.node.tags;

      for (const tag of tags) {
        if (tag.name === 'IPFS-Add') {
          const cid = tag.value;
          await ipfs.pin.add(cid);
          console.log(`Added ${cid} to IPFS`);
        }
      }
    }

    cursor = edges[edges.length - 1].cursor;
  }
}

main();
