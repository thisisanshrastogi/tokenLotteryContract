// import * as anchor from "@coral-xyz/anchor";
// import * as sb from "@switchboard-xyz/on-demand";
// import { Program } from "@coral-xyz/anchor";
// import { TokenLottery } from "../target/types/token_lottery";
// import { TOKEN_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/utils/token";
// import { getAssociatedTokenAddressSync } from "@solana/spl-token";
// import * as fs from "fs";
// import * as path from "path";

// describe("token-lottery", () => {
//   // const provider = anchor.AnchorProvider.env();
//   // const connection = provider.connection;
//   // const wallet = provider.wallet as anchor.Wallet;
//   // anchor.setProvider(provider);
//   const connection = new anchor.web3.Connection(
//     "https://api.devnet.solana.com",
//     "confirmed",
//   );

//   const wallet = anchor.Wallet.local();

//   const provider = new anchor.AnchorProvider(connection, wallet, {
//     commitment: "confirmed",
//   });

//   anchor.setProvider(provider);

//   const program = anchor.workspace.TokenLottery as Program<TokenLottery>;
//   let switchboardProgram: any = null;

//   // create a new wallet account
//   const rngKp = anchor.web3.Keypair.generate();

//   const TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey(
//     "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
//   );

//   // Derive PDAs for the lottery, collection mint, and collection token account
//   const tokenLottery = anchor.web3.PublicKey.findProgramAddressSync(
//     [Buffer.from("token_lottery")],
//     program.programId,
//   )[0];

//   const collectionMint = anchor.web3.PublicKey.findProgramAddressSync(
//     [Buffer.from("collection_mint")],
//     program.programId,
//   )[0];

//   const collectionTokenAccount = anchor.web3.PublicKey.findProgramAddressSync(
//     [Buffer.from("collection_associated_token")],
//     program.programId,
//   )[0];

//   const collectionMetadata = anchor.web3.PublicKey.findProgramAddressSync(
//     [
//       Buffer.from("metadata"),
//       TOKEN_METADATA_PROGRAM_ID.toBuffer(),
//       collectionMint.toBuffer(),
//     ],
//     TOKEN_METADATA_PROGRAM_ID,
//   )[0];

//   const collectionMasterEdition = anchor.web3.PublicKey.findProgramAddressSync(
//     [
//       Buffer.from("metadata"),
//       TOKEN_METADATA_PROGRAM_ID.toBuffer(),
//       collectionMint.toBuffer(),
//       Buffer.from("edition"),
//     ],
//     TOKEN_METADATA_PROGRAM_ID,
//   )[0];

//   before("Loading switchboard program", async () => {
//     const idlPaths = [
//       path.resolve(__dirname, "..", "setup", "ondemand_idl.json"),
//       path.resolve(process.cwd(), "setup", "ondemand_idl.json"),
//     ];
//     console.log("Checking paths:");
//     console.log(path.resolve(__dirname, "..", "setup", "ondemand_idl.json"));
//     console.log(path.resolve(process.cwd(), "setup", "ondemand_idl.json"));

//     for (const idlPath of idlPaths) {
//       try {
//         if (!fs.existsSync(idlPath)) {
//           continue;
//         }
//         const idlText = fs.readFileSync(idlPath, "utf8");
//         const switchboardIDL = JSON.parse(idlText);
//         // switchboardProgram = new anchor.Program(
//         //   switchboardIDL,
//         //   sb.ON_DEMAND_MAINNET_PID,
//         //   provider,
//         // );
//         switchboardProgram = {
//           provider: anchor.getProvider(),
//         };
//         console.log("Loaded Switchboard IDL from", idlPath);
//         return;
//       } catch (error) {
//         console.error("IDL LOAD FAILED:", error);
//         continue;
//       }
//     }

//     console.warn(
//       "Switchboard IDL not found at setup/ondemand_idl.json; skipping randomness tests.",
//     );
//   });

//   async function buyTicket() {
//     const lottery = await program.account.tokenLottery.fetch(tokenLottery);
//     const seed = new anchor.BN(lottery.totalTickets).toArrayLike(
//       Buffer,
//       "le",
//       8,
//     );

//     const ticketMint = anchor.web3.PublicKey.findProgramAddressSync(
//       [seed],
//       program.programId,
//     )[0];

//     const ticketMetadata = anchor.web3.PublicKey.findProgramAddressSync(
//       [
//         Buffer.from("metadata"),
//         TOKEN_METADATA_PROGRAM_ID.toBuffer(),
//         ticketMint.toBuffer(),
//       ],
//       TOKEN_METADATA_PROGRAM_ID,
//     )[0];

//     const ticketMasterEdition = anchor.web3.PublicKey.findProgramAddressSync(
//       [
//         Buffer.from("metadata"),
//         TOKEN_METADATA_PROGRAM_ID.toBuffer(),
//         ticketMint.toBuffer(),
//         Buffer.from("edition"),
//       ],
//       TOKEN_METADATA_PROGRAM_ID,
//     )[0];

//     const destination = getAssociatedTokenAddressSync(
//       ticketMint,
//       wallet.publicKey,
//     );

//     const buyTicketIx = await program.methods
//       .buyTicket()
//       .accounts({
//         buyer: wallet.publicKey,
//         tokenLottery,
//         ticketMint,
//         ticketMetadata,
//         ticketMasterEdition,
//         collectionMetadata,
//         collectionMasterEdition,
//         tokenProgram: TOKEN_PROGRAM_ID,
//         tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
//         collectionMint,
//         destination,
//         associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
//         rent: anchor.web3.SYSVAR_RENT_PUBKEY,
//         systemProgram: anchor.web3.SystemProgram.programId,
//       } as any)
//       .instruction();

//     const blockhashContext = await connection.getLatestBlockhash();

//     const computeIx = anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({
//       units: 300000,
//     });

//     const priorityIx = anchor.web3.ComputeBudgetProgram.setComputeUnitPrice({
//       microLamports: 1,
//     });

//     const tx = new anchor.web3.Transaction({
//       blockhash: blockhashContext.blockhash,
//       lastValidBlockHeight: blockhashContext.lastValidBlockHeight,
//       feePayer: wallet.payer.publicKey,
//     })
//       .add(computeIx)
//       .add(priorityIx)
//       .add(buyTicketIx);

//     const sig = await anchor.web3.sendAndConfirmTransaction(connection, tx, [
//       wallet.payer,
//     ]);
//     console.log("buy ticket", sig);
//   }

//   it("Is initialized!", async () => {
//     const slot = await connection.getSlot();
//     console.log("Current slot", slot);

//     const initConfigIx = await program.methods
//       .initializeConfig(
//         new anchor.BN(0),
//         new anchor.BN(slot + 10),
//         new anchor.BN(10000),
//       )
//       .accounts({
//         payer: wallet.publicKey,
//         tokenLottery,
//         systemProgram: anchor.web3.SystemProgram.programId,
//       } as any)
//       .instruction();

//     const initLotteryIx = await program.methods
//       .initializeLottery()
//       .accounts({
//         payer: wallet.publicKey,
//         collectionMint,
//         collectionTokenAccount,
//         metadata: collectionMetadata,
//         masterEdition: collectionMasterEdition,
//         tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
//         associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
//         tokenProgram: TOKEN_PROGRAM_ID,
//         systemProgram: anchor.web3.SystemProgram.programId,
//         rent: anchor.web3.SYSVAR_RENT_PUBKEY,
//       } as any)
//       .instruction();

//     const blockhashContext = await connection.getLatestBlockhash();

//     const tx = new anchor.web3.Transaction({
//       blockhash: blockhashContext.blockhash,
//       lastValidBlockHeight: blockhashContext.lastValidBlockHeight,
//       feePayer: wallet.payer.publicKey,
//     })
//       .add(initConfigIx)
//       .add(initLotteryIx);

//     const sig = await anchor.web3.sendAndConfirmTransaction(connection, tx, [
//       wallet.payer,
//     ]);
//     console.log(sig);
//   });

//   it("Is buying tickets!", async () => {
//     await buyTicket();
//     await buyTicket();
//     await buyTicket();
//     await buyTicket();
//     await buyTicket();
//   });

//   // it("Is committing and revealing a winner", async function () {
//   //   if (!switchboardProgram) {
//   //     this.skip();
//   //   }
//   //   const queue = sb.ON_DEMAND_DEVNET_QUEUE;

//   //   const queueAccount = new sb.Queue(switchboardProgram, queue);
//   //   console.log("Queue account", queue.toString());
//   //   try {
//   //     await queueAccount.loadData();
//   //   } catch (err) {
//   //     console.log("Queue account not found");
//   //     process.exit(1);
//   //   }

//   //   const [randomness, ix] = await sb.Randomness.create(
//   //     switchboardProgram,
//   //     rngKp,
//   //     queue,
//   //   );
//   //   console.log("Created randomness account..");
//   //   console.log("Randomness account", randomness.pubkey.toBase58());
//   //   console.log("rkp account", rngKp.publicKey.toBase58());

//   //   const createRandomnessTx = await sb.asV0Tx({
//   //     connection,
//   //     ixs: [ix],
//   //     payer: wallet.publicKey,
//   //     signers: [wallet.payer, rngKp],
//   //     computeUnitPrice: 75_000,
//   //     computeUnitLimitMultiple: 1.3,
//   //   });

//   //   const createBlockhash = await connection.getLatestBlockhash();
//   //   const createRandomnessSignature = await connection.sendTransaction(
//   //     createRandomnessTx,
//   //   );
//   //   await connection.confirmTransaction({
//   //     signature: createRandomnessSignature,
//   //     blockhash: createBlockhash.blockhash,
//   //     lastValidBlockHeight: createBlockhash.lastValidBlockHeight,
//   //   });
//   //   console.log(
//   //     "Transaction Signature for randomness account creation:",
//   //     createRandomnessSignature,
//   //   );

//   //   const sbCommitIx = await randomness.commitIx(queue);

//   //   const commitIx = await program.methods
//   //     .commitRandomness()
//   //     .accounts({
//   //       tokenLottery,
//   //       randomnessAccount: randomness.pubkey,
//   //       systemProgram: anchor.web3.SystemProgram.programId,
//   //     } as any)
//   //     .instruction();

//   //   const commitTx = await sb.asV0Tx({
//   //     connection: switchboardProgram.provider.connection,
//   //     ixs: [sbCommitIx, commitIx],
//   //     payer: wallet.publicKey,
//   //     signers: [wallet.payer],
//   //     computeUnitPrice: 75_000,
//   //     computeUnitLimitMultiple: 1.3,
//   //   });

//   //   const commitBlockhash = await connection.getLatestBlockhash();
//   //   const commitSignature = await connection.sendTransaction(commitTx);
//   //   await connection.confirmTransaction({
//   //     signature: commitSignature,
//   //     blockhash: commitBlockhash.blockhash,
//   //     lastValidBlockHeight: commitBlockhash.lastValidBlockHeight,
//   //   });
//   //   console.log("Transaction Signature for commit:", commitSignature);

//   //   const sbRevealIx = await randomness.revealIx();
//   //   const revealIx = await program.methods
//   //     .revealWinner()
//   //     .accounts({
//   //       payer: wallet.publicKey,
//   //       tokenLottery,
//   //       randomnessAccount: randomness.pubkey,
//   //     } as any)
//   //     .instruction();

//   //   const revealTx = await sb.asV0Tx({
//   //     connection: switchboardProgram.provider.connection,
//   //     ixs: [sbRevealIx, revealIx],
//   //     payer: wallet.publicKey,
//   //     signers: [wallet.payer],
//   //     computeUnitPrice: 75_000,
//   //     computeUnitLimitMultiple: 1.3,
//   //   });

//   //   const revealBlockhash = await connection.getLatestBlockhash();
//   //   const revealSignature = await connection.sendTransaction(revealTx);
//   //   await connection.confirmTransaction({
//   //     signature: revealSignature,
//   //     blockhash: revealBlockhash.blockhash,
//   //     lastValidBlockHeight: revealBlockhash.lastValidBlockHeight,
//   //   });
//   //   console.log("Transaction Signature revealTx", revealSignature);
//   // });

//   // it("Is claiming a prize", async function () {
//   //   if (!switchboardProgram) {
//   //     this.skip();
//   //   }
//   //   const lotteryConfig = await program.account.tokenLottery.fetch(
//   //     tokenLottery,
//   //   );
//   //   console.log("Lottery winner", lotteryConfig.winner);
//   //   console.log("Lottery config", lotteryConfig);

//   //   const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
//   //     wallet.publicKey,
//   //     { programId: TOKEN_PROGRAM_ID },
//   //   );
//   //   tokenAccounts.value.forEach(async (account) => {
//   //     console.log("Token account mint", account.account.data.parsed.info.mint);
//   //     console.log("Token account address", account.pubkey.toBase58());
//   //   });

//   //   const winningMint = anchor.web3.PublicKey.findProgramAddressSync(
//   //     [new anchor.BN(lotteryConfig.winner).toArrayLike(Buffer, "le", 8)],
//   //     program.programId,
//   //   )[0];
//   //   console.log("Winning mint", winningMint.toBase58());

//   //   const winningTokenAddress = getAssociatedTokenAddressSync(
//   //     winningMint,
//   //     wallet.publicKey,
//   //   );
//   //   console.log("Winning token address", winningTokenAddress.toBase58());

//   //   const metadataPDA = anchor.web3.PublicKey.findProgramAddressSync(
//   //     [
//   //       Buffer.from("metadata"),
//   //       TOKEN_METADATA_PROGRAM_ID.toBuffer(),
//   //       winningMint.toBuffer(),
//   //     ],
//   //     TOKEN_METADATA_PROGRAM_ID,
//   //   )[0];

//   //   const claimIx = await program.methods
//   //     .claimWinnings()
//   //     .accounts({
//   //       payer: wallet.publicKey,
//   //       tokenLottery,
//   //       collectionMint,
//   //       ticketMint: winningMint,
//   //       metadata: metadataPDA,
//   //       destination: winningTokenAddress,
//   //       collectionMetadata,
//   //       tokenProgram: TOKEN_PROGRAM_ID,
//   //       systemProgram: anchor.web3.SystemProgram.programId,
//   //       tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
//   //     } as any)
//   //     .instruction();

//   //   const blockhashContext = await connection.getLatestBlockhash();

//   //   const claimTx = new anchor.web3.Transaction({
//   //     blockhash: blockhashContext.blockhash,
//   //     lastValidBlockHeight: blockhashContext.lastValidBlockHeight,
//   //     feePayer: wallet.payer.publicKey,
//   //   }).add(claimIx);

//   //   const claimSig = await anchor.web3.sendAndConfirmTransaction(
//   //     connection,
//   //     claimTx,
//   //     [wallet.payer],
//   //   );
//   //   console.log(claimSig);
//   // });
// });

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { TokenLottery } from "../target/types/token_lottery";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";

describe("token-lottery (devnet)", () => {
  // -------------------------------
  // Provider Setup (DEVNET)
  // -------------------------------
  // const connection = new anchor.web3.Connection(
  //   "https://api.devnet.solana.com",
  //   "confirmed",
  // );

  const provider = anchor.AnchorProvider.env();
  const connection = provider.connection;
  const wallet = provider.wallet as anchor.Wallet;
  anchor.setProvider(provider);

  // const wallet = anchor.Wallet.local();

  // const provider = new anchor.AnchorProvider(connection, wallet, {
  //   commitment: "confirmed",
  // });

  anchor.setProvider(provider);

  const program = anchor.workspace.TokenLottery as Program<TokenLottery>;

  const TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey(
    "9KCLu5SgiiBXA2buXM2ZmEJdNpVaLUcHBgTo7T1QEfXP",
  );

  // -------------------------------
  // CONSTANTS
  // -------------------------------
  const lotteryId = new anchor.BN(0);

  // -------------------------------
  // PDAs
  // -------------------------------
  const [globalState] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("global_state")],
    program.programId,
  );

  const [tokenLottery] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("token_lottery"), lotteryId.toArrayLike(Buffer, "le", 8)],
    program.programId,
  );

  const [collectionMint] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("collection_mint")],
    program.programId,
  );

  const [collectionTokenAccount] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("collection_associated_token")],
    program.programId,
  );

  const [collectionMetadata] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      collectionMint.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID,
  );

  const [collectionMasterEdition] =
    anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        collectionMint.toBuffer(),
        Buffer.from("edition"),
      ],
      TOKEN_METADATA_PROGRAM_ID,
    );

  // -------------------------------
  // HELPERS
  // -------------------------------
  async function airdrop() {
    const sig = await connection.requestAirdrop(
      wallet.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL,
    );
    await connection.confirmTransaction(sig);
    console.log("Airdropped SOL");
  }

  async function buyTicket() {
    const lottery = await program.account.tokenLottery.fetch(tokenLottery);

    const ticketMint = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("ticket"),
        tokenLottery.toBuffer(),
        new anchor.BN(lottery.totalTickets).toArrayLike(Buffer, "le", 8),
      ],
      program.programId,
    )[0];

    const ticketMetadata = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        ticketMint.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID,
    )[0];

    const ticketMasterEdition = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        ticketMint.toBuffer(),
        Buffer.from("edition"),
      ],
      TOKEN_METADATA_PROGRAM_ID,
    )[0];

    const destination = getAssociatedTokenAddressSync(
      ticketMint,
      wallet.publicKey,
    );

    const tx = await program.methods
      .buyTicket(lotteryId)
      .accounts({
        buyer: wallet.publicKey,
        tokenLottery,
        ticketMint,
        ticketMetadata,
        ticketMasterEdition,
        collectionMetadata,
        collectionMasterEdition,
        tokenProgram: TOKEN_PROGRAM_ID,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        collectionMint,
        destination,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Ticket bought:", tx);
  }

  // -------------------------------
  // TEST FLOW
  // -------------------------------
  it("Full flow", async () => {
    await airdrop();

    // 1. Init Global State
    await program.methods
      .initializeGlobalState()
      .accounts({
        payer: wallet.publicKey,
        globalState,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Global state initialized");

    // 2. Init Config
    const slot = await connection.getSlot();

    await program.methods
      .initializeConfig(
        lotteryId,
        new anchor.BN(slot + 10),
        new anchor.BN(slot + 10000),
        new anchor.BN(1_000_000), // ticket price
      )
      .accounts({
        payer: wallet.publicKey,
        tokenLottery,
        globalState,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Lottery config initialized");

    // 3. Init Collection NFT
    await program.methods
      .initializeLottery(lotteryId)
      .accounts({
        payer: wallet.publicKey,
        collectionMint,
        collectionTokenAccount,
        metadata: collectionMetadata,
        masterEdition: collectionMasterEdition,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    console.log("Collection NFT created");

    // wait until lottery starts
    console.log("Waiting for lottery start...");
    await new Promise((r) => setTimeout(r, 5000));

    // 4. Buy Tickets
    await buyTicket();
    await buyTicket();
    await buyTicket();

    console.log("Tickets purchased");
  });
});
