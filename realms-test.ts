import { Connection, PublicKey } from "@solana/web3.js";
import { SplGovernance } from "governance-idl-sdk";

const main = async () => {
  const connection = new Connection(
    "https://mainnet.helius-rpc.com/?api-key=9ed2be22-b330-4e04-81cb-c83cae846ba4",
    "confirmed"
  );

  const REALM_ID = "5PP7vKjJyLw1MR55LoexRsCj3CpZj9MdD6aNXRrvxG42";
  const PROGRAM_ID = "GovER5Lthms3bLBqWub97yVrMmEogzX7xNjdXpPPCVZw";

  const splGovernance = new SplGovernance(
    connection,
    new PublicKey(PROGRAM_ID)
  );

  const realmPk = new PublicKey(REALM_ID);
  const realms = await splGovernance.getRealmByPubkey(realmPk);

  // 1. Get all governance accounts in this realm
  const governanceAccounts = await splGovernance.getGovernanceAccountsByRealm(
    realmPk
  );
  console.log(`Fetched ${governanceAccounts.length} governance accounts.`);

  // 2. For each governance, fetch its proposals
  const proposalsByGovArrays = await Promise.all(
    governanceAccounts.map((gov) =>
      splGovernance.getProposalsforGovernance(gov.publicKey)
    )
  );

  // 3. Flatten into a single array
  const allProposals = proposalsByGovArrays.flat();

  console.log(`Total proposals fetched: ${allProposals.length}`);

  // 5. Example: log a few proposals
  allProposals.slice(0, 5).forEach((p, idx) => {
    console.log(`Proposal #${idx}:`, p);
  });
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
