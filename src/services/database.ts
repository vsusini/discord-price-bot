import Database from "better-sqlite3";
import path from "path";

interface Proposal {
  proposalId: string;
  state: string;
  resultMessageSent: boolean;
}

export class ProposalDatabaseService {
  private static instance: ProposalDatabaseService | null = null;
  private db: Database.Database;

  private constructor() {
    const dbPath = path.join(process.cwd(), "data", "proposals.db");
    this.db = new Database(dbPath);
    this.initializeTables();
  }

  static getInstance(): ProposalDatabaseService {
    if (!ProposalDatabaseService.instance) {
      ProposalDatabaseService.instance = new ProposalDatabaseService();
    }
    return ProposalDatabaseService.instance;
  }

  private initializeTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS proposals (
        proposal_id TEXT PRIMARY KEY,
        state TEXT NOT NULL,
        result_message_sent BOOLEAN DEFAULT FALSE
      );
    `);
  }

  addProposal(proposalId: string, state: string): boolean {
    const insert = this.db.prepare(`
      INSERT OR IGNORE INTO proposals (proposal_id, state)
      VALUES (?, ?)
    `);
    try {
      insert.run(proposalId, state);
      return true;
    } catch (error) {
      console.error("Error adding proposal:", error);
      return false;
    }
  }

  updateProposalState(proposalId: string, newState: string, resultMessageSent: boolean = false): boolean {
    const update = this.db.prepare(`
      UPDATE proposals
      SET state = ?, result_message_sent = ?
      WHERE proposal_id = ?
    `);
    try {
      const result = update.run(newState, resultMessageSent, proposalId);
      return result.changes > 0;
    } catch (error) {
      console.error("Error updating proposal state:", error);
      return false;
    }
  }

  getAllProposals(): Proposal[] {
    const stmt = this.db.prepare("SELECT * FROM proposals");
    return stmt.all() as Proposal[];
  }

  getProposalsByState(state: string): Proposal[] {
    const stmt = this.db.prepare("SELECT * FROM proposals WHERE state = ?");
    return stmt.all(state) as Proposal[];
  }

  getProposalsNotCompleted(): Proposal[] {
    const stmt = this.db.prepare("SELECT * FROM proposals WHERE state != 'COMPLETED'");
    return stmt.all() as Proposal[];
  }

  proposalExists(proposalId: string): boolean {
    const stmt = this.db.prepare("SELECT 1 FROM proposals WHERE proposal_id = ?");
    return !!stmt.get(proposalId);
  }
}
