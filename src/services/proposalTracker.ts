import { Client, TextChannel, EmbedBuilder, Colors } from "discord.js";
import { config } from "../config";
import { CONSTANTS } from "../utils/constants";
import { ProposalDatabaseService } from "./database";

interface TrackedProposal {
  proposalId: string;
  name: string;
  state: string;
  resultMessageSent: boolean;
}

export class ProposalTracker {
  private client: Client;
  private db: ProposalDatabaseService;
  private updateInterval: NodeJS.Timeout | null = null;
  private static instance: ProposalTracker | null = null;

  constructor(client: Client) {
    this.client = client;
    this.db = ProposalDatabaseService.getInstance();
    this.startTracking();
  }

  static getInstance(client?: Client): ProposalTracker {
    if (!ProposalTracker.instance && client) {
      ProposalTracker.instance = new ProposalTracker(client);
    }
    if (!ProposalTracker.instance) {
      throw new Error("ProposalTracker not initialized");
    }
    return ProposalTracker.instance;
  }

  private async getNotificationChannel(): Promise<TextChannel> {
    const channel = await this.client.channels.fetch(config.PROPOSAL_NOTIFICATION_CHANNEL);
    if (!channel || !(channel instanceof TextChannel)) {
      throw new Error("Proposal notification channel not found or is not a text channel");
    }
    return channel;
  }

  private async getResultsChannel(): Promise<TextChannel> {
    const channel = await this.client.channels.fetch(config.PROPOSAL_RESULTS_CHANNEL);
    if (!channel || !(channel instanceof TextChannel)) {
      throw new Error("Proposal results channel not found or is not a text channel");
    }
    return channel;
  }

  private async sendNewProposalMessage(notificationChannel: TextChannel, proposal: any): Promise<void> {
    const embed = new EmbedBuilder()
      .setColor(CONSTANTS.COLORS.PRIMARY)
      .setTitle(`NewProposal: ${proposal.name}`)
      .setDescription([
        `🔗 Proposal: [\`${proposal.publicKey?.toBase58?.() || proposal.pubkey?.toBase58?.() || "N/A"}\`](https://realms.today/proposal/${proposal.publicKey?.toBase58?.() || proposal.pubkey?.toBase58?.() || "N/A"})`,
        `📝 Name: \`${proposal.name}\``,
        `🗳️ State: \`${proposal.state}\``,
      ].join("\n"));

    await notificationChannel.send({ embeds: [embed] });
  }

  private async sendProposalResultsMessage(resultsChannel: TextChannel, proposal: any): Promise<void> {
    const embed = new EmbedBuilder()
      .setColor(CONSTANTS.COLORS.SUCCESS)
      .setTitle(`Proposal Results: ${proposal.name}`)
      .setDescription([
        `🔗 Proposal: [\`${proposal.publicKey?.toBase58?.() || proposal.pubkey?.toBase58?.() || "N/A"}\`](https://realms.today/proposal/${proposal.publicKey?.toBase58?.() || proposal.pubkey?.toBase58?.() || "N/A"})`,
        `📝 Name: \`${proposal.name}\``,
        `🗳️ Final State: \`${proposal.state}\``,
      ].join("\n"));

    await resultsChannel.send({ embeds: [embed] });
  }

  private async checkProposals(proposals: any[]): Promise<void> {
    try {
      const notificationChannel = await this.getNotificationChannel();
      const resultsChannel = await this.getResultsChannel();

      for (const proposal of proposals) {
        const proposalId = proposal.publicKey?.toBase58?.() || proposal.pubkey?.toBase58?.();
        if (!proposalId) continue;

        const existing = this.db.proposalExists(proposalId);
        const currentState = JSON.stringify(proposal.state);

        if (!existing) {
          // New proposal
          this.db.addProposal(proposalId, currentState);
          await this.sendNewProposalMessage(notificationChannel, proposal);
        } else {
          // Proposal exists, check for state change
          const tracked = this.db.getAllProposals().find(p => p.proposalId === proposalId);
          if (tracked && tracked.state !== currentState) {
            this.db.updateProposalState(proposalId, currentState, false);

            // If transitioning from voting to anything else
            if (tracked.state.includes("voting") && !currentState.includes("voting")) {
              await this.sendProposalResultsMessage(resultsChannel, proposal);
              this.db.updateProposalState(proposalId, currentState, true);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error in checkProposals:", error);
    }
  }

  private startTracking() {
    console.log(`Starting proposal tracker with ${config.PROPOSAL_CHECK_INTERVAL} second interval`);
    this.updateInterval = setInterval(async () => {
      // Fetch latest proposals from your governance API here
      // const proposals = await fetchLatestProposals();
      // await this.checkProposals(proposals);
    }, config.PROPOSAL_CHECK_INTERVAL * 1000);
  }

  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }
}
