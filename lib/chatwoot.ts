const CHATWOOT_BASE_URL = "https://chatwoot.n8nsandro.site";

interface ChatwootContact {
  id: number;
  name: string;
  phone_number?: string;
  email?: string;
}

interface ChatwootConversation {
  id: number;
  inbox_id: number;
  contact_id: number;
}

interface ChatwootMessage {
  id: number;
  content: string;
  message_type: string;
  created_at: number;
}

export class ChatwootClient {
  private accountId: string;
  private apiToken: string;
  private inboxId: string;

  constructor(accountId: string, apiToken: string, inboxId: string) {
    this.accountId = accountId;
    this.apiToken = apiToken;
    this.inboxId = inboxId;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${CHATWOOT_BASE_URL}/api/v1/accounts/${this.accountId}${path}`;
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        api_access_token: this.apiToken,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Chatwoot API error ${response.status}: ${error}`);
    }

    return response.json();
  }

  async findOrCreateContact(
    name: string,
    phone: string,
    email?: string
  ): Promise<ChatwootContact> {
    // Search for existing contact
    try {
      const searchResult = await this.request<{ payload: ChatwootContact[] }>(
        "GET",
        `/contacts/search?q=${encodeURIComponent(phone)}&include_contacts=true`
      );

      if (searchResult.payload && searchResult.payload.length > 0) {
        return searchResult.payload[0];
      }
    } catch {
      // Contact not found, create new
    }

    // Create new contact
    const contact = await this.request<ChatwootContact>("POST", "/contacts", {
      name,
      phone_number: phone,
      email,
    });

    return contact;
  }

  async findOrCreateConversation(
    contactId: number
  ): Promise<ChatwootConversation> {
    // Search for existing conversation
    try {
      const result = await this.request<{
        data: { payload: ChatwootConversation[] };
      }>("GET", `/contacts/${contactId}/conversations`);
      const conversations = result.data?.payload || [];

      if (conversations.length > 0) {
        // Return most recent conversation
        return conversations[0];
      }
    } catch {
      // No conversation found
    }

    // Create new conversation
    const conversation = await this.request<ChatwootConversation>(
      "POST",
      "/conversations",
      {
        contact_id: contactId,
        inbox_id: parseInt(this.inboxId),
      }
    );

    return conversation;
  }

  async sendMessage(
    conversationId: number,
    message: string
  ): Promise<ChatwootMessage> {
    return this.request<ChatwootMessage>(
      "POST",
      `/conversations/${conversationId}/messages`,
      {
        content: message,
        message_type: "outgoing",
        private: false,
      }
    );
  }

  async sendWhatsAppMessage(
    name: string,
    phone: string,
    message: string,
    email?: string
  ): Promise<{ contactId: string; conversationId: string }> {
    const contact = await this.findOrCreateContact(name, phone, email);
    const conversation = await this.findOrCreateConversation(contact.id);
    await this.sendMessage(conversation.id, message);

    return {
      contactId: String(contact.id),
      conversationId: String(conversation.id),
    };
  }
}

export function createChatwootClient(
  accountId: string,
  apiToken: string,
  inboxId: string
) {
  return new ChatwootClient(accountId, apiToken, inboxId);
}
