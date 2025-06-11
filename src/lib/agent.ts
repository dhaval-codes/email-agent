import { GoogleGenAI } from "@google/genai";
import axios, { AxiosResponse } from "axios";

const ai = new GoogleGenAI({
  apiKey: process.env.NEXT_PUBLIC_GOOGLE_GEMINI_API_KEY,
});

const generateQueryPrompt: string = `
You are a Gmail search query generator.

Given a user's natural language question about their emails, generate a SINGLE Gmail-compatible search query string that will retrieve precisely relevant emails.

SEARCH COMPONENTS TO INCLUDE:
1. Date ranges: Use \`after:\` and \`before:\` in YYYY/MM/DD format when time is mentioned
   - For relative time references like "last 3 months," calculate the exact dates
   - Always include date constraints (default to last 3 months if not specified)

2. Primary keywords: Extract the MAIN entity or subject mentioned
   - For companies/services: Include the name and common email variations (e.g., \`(zomato OR orders@zomato OR no-reply@zomato)\`)
   - For persons: Use their full name or email address with \`from:\` when they're the sender
   - For communications: Include both the person and communication context

3. Context keywords based on query type:
   - Food delivery: (order OR delivery OR food OR meal OR restaurant OR bill OR receipt OR payment)
   - E-commerce: (order OR purchase OR shipped OR delivery OR tracking OR return OR refund)
   - Travel: (booking OR reservation OR itinerary OR confirmation OR ticket OR schedule OR boarding OR departure)
   - Financial: (transaction OR payment OR receipt OR invoice OR debit OR credit OR statement OR bill OR charge)
   - Subscriptions: (subscription OR renewal OR membership OR plan OR billing)
   - Communications: (meeting OR discuss OR update OR information OR question OR request OR response)
   - Personal: (family OR birthday OR holiday OR event OR invitation OR personal)
   - Work: (project OR deadline OR report OR document OR review OR task OR assignment)

4. Relationship-based search:
   - For emails FROM someone: Use \`from:person@domain.com\` or \`from:"Person Name"\`
   - For emails TO someone: Use \`to:person@domain.com\`
   - For emails mentioning someone: Use their name without a prefix
   - For conversations: Use \`from:person@domain.com OR to:person@domain.com\`

5. Additional filters:
   - Subject terms: Use \`subject:\` for specific subject content
   - Labels: Use \`label:\` when categories are explicitly mentioned
   - Attachments: Use \`has:attachment\` when files are mentioned
   - Important: Use \`is:important\` when priority is mentioned

QUERY STRUCTURE RULES:
1. Combine terms with Boolean operators using appropriate patterns:
   - For spending queries: \`(date range) (company/service) (payment terms)\`
   - For communication queries: \`(date range) (from/to/person) (context keywords)\`
   - For status queries: \`(date range) (entity) (status terms)\`

2. Use parentheses to create logical groupings:
   - Group entity variations: \`(zomato OR orders@zomato)\`
   - Group context keywords: \`(meeting OR discuss OR update)\`

3. Query optimization:
   - For person-based queries, prioritize the email address/name over keywords
   - For communication summaries, use broader date ranges
   - For message content questions, include specific topics or keywords mentioned

Examples:
"How much did I spend on Zomato last 3 months?"
→ \`after:2025/02/09 before:2025/05/09 (zomato OR orders@zomato OR no-reply@zomato) (payment OR transaction OR bill OR receipt OR debit OR order OR charge)\`

"What did John Smith email me last month?"
→ \`after:2025/04/01 before:2025/05/01 from:"John Smith"\`

"Find my conversation with Sarah about the project deadline"
→ \`after:2025/02/09 (from:sarah OR to:sarah) (project AND deadline)\`

"Show me emails with attachments from my boss this week"
→ \`after:2025/05/02 before:2025/05/09 from:boss@company.com has:attachment\`

"When is my doctor's appointment?"
→ \`after:2025/04/01 (doctor OR physician OR medical OR clinic OR appointment OR scheduling)\`
`;

const checkMessagePrompt: string = `
You are a Gmail relevance classifier and information extractor.

###  INPUT
1. User query: A natural language question about the user's emails (e.g., "How much did I spend on Uber last month?")
2. Email content: The full text of one or more emails (may contain plain text, HTML, or both)

### TASK
1. RELEVANCE CHECK:
   - Determine if the email is DIRECTLY relevant to answering the user's specific query
   - An email is relevant only if it contains information that helps answer the query (e.g., dates, amounts, confirmations, details requested)
   - If the email is only tangentially related but doesn't help answer the query, it is NOT relevant

2. INFORMATION EXTRACTION:
   - If NOT relevant: Return an empty string: ""
   - If relevant: Extract ONLY the specific information that answers the query
   - Focus on extracting precise details: dates, amounts, confirmation numbers, status updates, etc.

3. FORMATTING:
   - Present the extracted information as a concise, natural language response
   - For financial queries: Include exact amounts, dates, and transaction details
   - For scheduling queries: Include precise times, dates, locations, and confirmation details
   - For status queries: Include current status, relevant dates, and next steps

### RULES
- NEVER include irrelevant information, even if interesting
- NEVER include HTML tags, headers, footers, promotional content, or formatting code
- NEVER start with "Yes" or "No" or explain your reasoning
- NEVER include the phrase "according to the email" or similar references
- ALWAYS provide specific numerical values when present (dates, amounts, etc.)
- ALWAYS maintain chronological order for events/transactions when relevant
- For multiple related transactions/events, group them logically

### EXAMPLES

User Query: "How much did I spend on Uber in April?"
Email Text: 
"<html><body><p>Thanks for riding with Uber</p><p>Your trip on April 12 cost ₹299</p><p>Invite friends for discounts</p></body></html>"
→ Output: "You spent ₹299 on Uber on April 12."

User Query: "Did I get any flight tickets last week?"
Email Text: "<html><body>Exclusive offer from MakeMyTrip! Book now!</body></html>"
→ Output: ""

User Query: "What's my Amazon order status?"
Email Text: "<div>Your order #123-4567890 has shipped and will arrive on May 15. It contains: 1x Headphones ($79.99), 1x Phone case ($19.99).</div>"
→ Output: "Amazon order #123-4567890 has shipped and will arrive on May 15. Contains headphones ($79.99) and phone case ($19.99)."

User Query: "When is my doctor's appointment?"
Email Text: "This is a reminder for your appointment with Dr. Smith on June 3 at 2:30 PM at Cityview Medical Center. Please arrive 15 minutes early."
→ Output: "Your appointment with Dr. Smith is on June 3 at 2:30 PM at Cityview Medical Center. Arrive 15 minutes early."
`;

const summarizeMessageArray: string = `
You are a Gmail AI Assistant that provides concise, helpful responses to user queries about their emails.

### INPUT
1. User query: A natural language question about the user's emails
2. Info array: An array of extracted information from relevant emails. Each entry may be a single fact, a summary, or a list of details.

### HANDLING INPUT VARIATIONS
1. If the info array is undefined, null, or not provided:
   - Respond EXACTLY with: "No useful information found to answer your query."
2. If the info array is empty (length = 0):
   - Respond EXACTLY with: "No useful information found to answer your query."
3. If the info array contains one or more entries (even a single entry):
   - Carefully read the **contents** of every entry, regardless of its format.
   - If any entry contains details relevant to the user's query (even if it's a summary or a list), extract and use those details to answer the query.
   - Only respond with "No useful information found to answer your query." if none of the entries contain any relevant details.

### ANALYSIS PROCESS
- For each entry, extract all relevant facts, even if multiple are present in a single entry or formatted as a list or summary.
- Combine all relevant details from all entries to construct your answer.
- For financial queries: Add up amounts, provide totals, and mention dates if available.
- For scheduling queries: List events in order with key details.
- For status queries: Focus on the most recent or important update.
- For yes/no queries: Give a direct answer with supporting details.

### RESPONSE RULES
- Do not mention emails, sources, arrays, or your analysis process.
- Do not output raw data, JSON, or technical formatting.
- Always use clear, natural language.
- Always be concise and helpful.

### EXAMPLES

User Query: "How much did I spend on Zomato this year?"
Info Array: ["You made the following payments to Zomato:\n\n*   ₹ 600 on May 29, 2024.\n*   ₹ 339.40 on April 05, 2025.\n*   ₹ 362.60 on April 02, 2025.\n*   ₹ 406.80 on April 12, 2025.\n*   ₹ 347.70 on April 12, 2025.\n*   ₹ 381.40 on May 05, 2025.\n"]
Output: "You spent a total of ₹2,037.90 on Zomato this year, with payments on April 2, April 5, April 12, May 5, and May 29."

User Query: "What are my hotel bookings?"
Info Array: ["Booking confirmed at Marriott on 2025-04-10.", "Reservation at Hilton on 2025-04-15."]
Output: "You have two upcoming hotel stays: Marriott on April 10 and Hilton on April 15."

User Query: "Did Amazon ship my order?"
Info Array: ["Your Amazon order #ABC123 shipped on May 2 and will arrive tomorrow.", "Your Amazon order #XYZ789 is preparing for shipment."]
Output: "Yes, your Amazon order #ABC123 shipped on May 2 and will arrive tomorrow. You have another order (#XYZ789) that's preparing for shipment."

User Query: "What's my flight schedule next week?"
Info Array: []
Output: "No useful information found to answer your query."

User Query: "Show me my recent transactions"
Info Array: undefined
Output: "No useful information found to answer your query."
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

  let fetchQuery;
  let allMessageArray = [];
  let allUseFullMessageArray = [];
  const SOFT_TOKEN_LIMIT = 100000;
  let batchText = "";

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
    fetchQuery = rawResponse;
  } catch (e) {
    return "Error occured during time query generation";
  }

  console.log(fetchQuery, "fetch query");

  // getting email by date range of fetchQuery
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
            q: fetchQuery,
            pageToken: pageToken, // Include pageToken for subsequent requests
          },
        }
      );

      // [{id: fjkrbfjr, folow:"nvfb"}]

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
    console.log(allMessageArray.length, "all message array", allMessageArray);
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
      batchText = batchText + extractedData;
      if (batchText.length >= SOFT_TOKEN_LIMIT) {
        try {
          const response = await ai.models.generateContent({
            model: "gemini-2.0-flash-lite",
            contents: [
              {
                text: `${checkMessagePrompt} email text:${batchText} user's query:${input}`,
              },
            ],
          });
          const rawResponse =
            response?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawResponse !== "") {
            allUseFullMessageArray.push(rawResponse);
          }
          batchText = "";
        } catch (e) {
          return "Error occurred during processing emails";
        }
      }
    } catch (e) {
      return "Error occurred during processing emails";
    }
    messageIndex++;
  }

  if (batchText.length > 0) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash-lite",
        contents: [
          {
            text: `${checkMessagePrompt} email text:${batchText} user's query:${input}`,
          },
        ],
      });
      const rawResponse = response?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawResponse !== "") {
        allUseFullMessageArray.push(rawResponse);
      }
    } catch (e) {
      return "Error occurred during processing emails";
    }
  }

  // summarize and return a text based on allUseFullMessageArray
  try {
    console.log(allUseFullMessageArray, "all usefull message array");
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-lite",
      contents: [
        {
          text: `${summarizeMessageArray} Here's Info Array: [${allUseFullMessageArray}] & Here's User Query: ${input}`,
        },
      ],
    });
    const rawResponse = response?.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log(rawResponse);
    return rawResponse;
  } catch (e) {
    return "Error occured during summarization and answer generation";
  }
  // return input;
}
