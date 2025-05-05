import { GoogleGenAI } from "@google/genai";
import axios, { AxiosResponse } from "axios";
import { time } from "console";

const ai = new GoogleGenAI({
  apiKey: process.env.NEXT_PUBLIC_GOOGLE_GEMINI_API_KEY,
});

const generateQueryPrompt: string = `
You are a Gmail date range extractor.

Given a user's natural language prompt about their Gmail inbox (e.g., "emails from last week" or "show me mails I received in March 2024"), extract and return **only** the Gmail-compatible date range query string to be used in the following API:

https://gmail.googleapis.com/gmail/v1/users/me/messages?q=<QUERY>

Output Format:
- Only include Gmail's date filters: \`after:\` and/or \`before:\` in the format YYYY/MM/DD
- Do NOT include anything else (no "from:", "subject:", explanations, or quotes)
- Return a single line containing only the query string

Examples:
Prompt: "Emails from last week"
→ Output: \`after:2025/04/28 before:2025/05/05\`

Prompt: "Emails I got in March 2024"
→ Output: \`after:2024/03/01 before:2024/04/01\`
`;

const checkMessagePrompt: string = `
You are a Gmail relevance classifier and summarizer.

Given:
1. A user query describing what kind of email they are looking for (e.g., "How much did I spend on Uber last month?")
2. The full content of a single Gmail message (may contain plain text, HTML, or both)

Your task:
- First, check if the email content is **relevant** to the user's query.
  - Relevant means the email directly helps answer or support the user's question (e.g., contains prices, receipts, confirmations, etc.).
- If the email is **not relevant**, return an empty string: \`""\`
- If the email **is relevant**, extract only the meaningful content (ignore headers, footers, HTML tags, spammy elements), and summarize it in a human-readable way that **directly answers the user’s query**.

Formatting Rules:
- Output must be a clean, natural language sentence that answers the query.
- Do NOT output YES or NO.
- Do NOT include the original email content or HTML.
- Do NOT explain your reasoning.

Examples:

User Query: "How much did I spend on Uber in April?"
Email Text: 
"<html><body><p>Thanks for riding with Uber</p><p>Your trip on April 12 cost ₹299</p></body></html>"
→ Output: "You spent ₹299 on Uber on April 12."

User Query: "Did I get any flight tickets last week?"
Email Text: "<html><body>Exclusive offer from MakeMyTrip! Book now!</body></html>"
→ Output: ""

`;

const summarizeMessageArray: string = `
You are a Gmail AI assistant.

Given:
1. A user query describing what the user wants to know.
2. An array of text strings extracted from emails. These may include valid financial transactions, summaries, or could be empty strings (e.g., "" or whitespace).

Your task:
- First, filter out any empty, null, or irrelevant entries from the array.
- If **no relevant or meaningful information remains**, return exactly: "No useful information found to answer your query."
- Otherwise, analyze the remaining valid entries and generate a short, human-like response that directly answers the query.
- Do **not** return raw data, arrays, or explanations—just the final answer in clear, conversational English.

Formatting:
- If the array contains useful data (e.g., amounts, transaction dates, keywords like 'debited', 'credited', 'order', etc.), use it to generate a summary.
- If the array is effectively empty or contains no valid data for the query, return only: "No useful information found to answer your query."
- Do **not** assume or guess anything beyond the input data.

Example 1:
Query: "How much did I spend on Uber last week?"
Info Array: ["", "", "", "Rs.200.00 was debited from your account 9400 to VPA q802036901@ybl on 05-05-25.", "", "", ""]
→ Output: "You spent ₹200 on May 5th via UPI."

Example 2:
Query: "What are my hotel bookings this month?"
Info Array: ["", "", "", "", "", "", ""]
→ Output: "No useful information found to answer your query."

Strictly follow these rules. Do not be overly polite or apologetic in your response.
`;

// type interfaces
interface GmailMessageListResponse {
  messages?: { id: string; threadId: string }[];
  nextPageToken?: string;
  resultSizeEstimate?: number;
}

interface GmailMessagePartBody {
  data?: string; // Base64 encoded content
  size?: number;
}

interface GmailMessagePart {
  partId?: string;
  mimeType?: string;
  filename?: string;
  headers?: { name: string; value: string }[];
  body?: GmailMessagePartBody;
  parts?: GmailMessagePart[]; // For multipart messages
}

interface GmailMessagePayload {
  partId?: string;
  mimeType?: string;
  headers?: { name: string; value: string }[];
  body?: GmailMessagePartBody;
  parts?: GmailMessagePart[];
}

interface GmailMessageResponse {
  id?: string;
  threadId?: string;
  labelIds?: string[];
  snippet?: string;
  payload?: GmailMessagePayload;
  sizeEstimate?: number;
  raw?: string; // The entire message in RFC2822 format
}

function extractTextHtmlContent(
  payload: GmailMessagePayload | undefined
): string | null {
  if (!payload) {
    return null;
  }

  const headers = payload.headers || [];
  const contentTypeHeader = headers.find(
    (header) => header.name.toLowerCase() === "content-type"
  );
  const contentType = contentTypeHeader?.value || "text/plain";

  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return Buffer.from(payload.body.data, "base64").toString("utf-8");
  } else if (payload.mimeType === "text/html" && payload.body?.data) {
    return Buffer.from(payload.body.data, "base64").toString("utf-8");
  } else if (payload.parts) {
    for (const part of payload.parts) {
      const content = extractTextHtmlContent(part);
      if (content) {
        return content;
      }
    }
  }
  return null;
}

export default async function ChatWithAIAgent({
  input,
  session,
}: {
  input: string;
  session: any;
}) {
  if (!session) {
    return "Login to access this feature";
  }

  let timeQuery;
  let allMessageArray = [];
  let allUseFullMessageArray = [];

  // converting user prompt to time query to fetch emails of that particular time period
  try {
    const currentDate: Date = new Date();
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-lite",
      contents: [
        {
          text: `${generateQueryPrompt} ${input} and here's today's date for better reference ${currentDate}`,
        },
      ],
    });
    const rawResponse = response?.candidates?.[0]?.content?.parts?.[0]?.text;
    timeQuery = rawResponse;
  } catch (e) {
    return "Error occured during time query generation";
  }

  // getting email by date range of timeQuery
  let pageToken: string | undefined;
  try {
    do {
      const response: AxiosResponse<GmailMessageListResponse> = await axios.get(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages",
        {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
          params: {
            q: timeQuery,
            pageToken: pageToken, // Include pageToken for subsequent requests
          },
        }
      );

      const data = response.data;
      if (data.messages) {
        allMessageArray.push(...data.messages); // Concatenate messages
      }
      pageToken = data.nextPageToken; // Update pageToken for the next iteration
      // console.log(
      //   `Fetched ${
      //     data.messages?.length || 0
      //   } messages, nextPageToken: ${pageToken}`
      // ); //Debug log
    } while (pageToken); // Continue as long as there's a nextPageToken
    // console.log(allMessageArray);
  } catch (error: any) {
    console.log(
      "Error fetching emails:",
      error.response ? error.response.data : error.message
    );
    return "Error occured during fetching emails";
  }

  // fetch contents of individual emails (text/html/any except for attachments) for all the allMessageArray
  let messageIndex = 0;
  while (messageIndex < allMessageArray.length) {
    let messageID = allMessageArray[messageIndex].id;
    let apiUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageID}`;
    try {
      const response: AxiosResponse<GmailMessageResponse> = await axios.get(
        apiUrl,
        {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
          params: {
            format: "full",
          },
        }
      );
      const messageData = response.data;
      let extractedData = extractTextHtmlContent(messageData.payload);
      try {
        const response = await ai.models.generateContent({
          model: "gemini-2.0-flash-lite",
          contents: [
            {
              text: `${checkMessagePrompt} email text:${extractedData} user's query:${input}`,
            },
          ],
        });
        const rawResponse =
          response?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawResponse !== "") {
          allUseFullMessageArray.push(rawResponse);
        }
      } catch (e) {
        return "Error occurred during processing emails";
      }
    } catch (e) {
      return "Error occurred during processing emails";
    }
    messageIndex++;
  }

  // summarize and return a text based on allUseFullMessageArray
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-lite",
      contents: [
        {
          text: `${summarizeMessageArray} Here's Message Array: ${allUseFullMessageArray} & Here's User Query: ${input}`,
        },
      ],
    });
    const rawResponse = response?.candidates?.[0]?.content?.parts?.[0]?.text;
    return rawResponse;
  } catch (e) {
    return "Error occured during summarization and answer generation";
  }
  // return input;
}
