use anchor_lang::prelude::*;
use anchor_lang::system_program::*;
use anchor_lang::system_program::{transfer, Transfer};
use anchor_spl::metadata::{
    create_metadata_accounts_v3, mpl_token_metadata::instructions::CreateMetadataAccountV3,
    CreateMetadataAccountsV3,
};
use anchor_spl::{
    associated_token::AssociatedToken,
    metadata::Metadata,
    token_interface::{mint_to, Mint, MintTo, TokenAccount, TokenInterface},
};

use anchor_spl::metadata::{
    create_master_edition_v3,
    mpl_token_metadata::types::{CollectionDetails, Creator, DataV2},
    set_and_verify_collection, sign_metadata, CreateMasterEditionV3,
    SetAndVerifySizedCollectionItem, SignMetadata,
};

pub mod context;
pub mod store;

pub use crate::context::*;
pub use crate::store::*;

#[constant]
pub const NAME: &str = "Token Lottery Ticket#";
#[constant]
pub const SYMBOL: &str = "TICK";
#[constant]
pub const URI: &str = "https://raw.githubusercontent.com/solana-developers/developer-bootcamp-2024/refs/heads/main/project-9-token-lottery/metadata.json";

declare_id!("Ar4mY3kDJB22X3McHMZq7Ncd2JceKpb5S4gASL6Exh8T");

#[program]
pub mod token_lottery {

    use anchor_spl::metadata::set_and_verify_sized_collection_item;
    use switchboard_on_demand::RandomnessAccountData;

    use super::*;
    pub fn initialize_config(
        ctx: Context<Initialize>,
        start: u64,
        end: u64,
        price: u64,
    ) -> Result<()> {
        ctx.accounts.token_lottery.bump = ctx.bumps.token_lottery;
        ctx.accounts.token_lottery.start_time = start;
        ctx.accounts.token_lottery.end_time = end;
        ctx.accounts.token_lottery.lottery_pot_amount = price;
        ctx.accounts.token_lottery.authority = *ctx.accounts.payer.key;
        ctx.accounts.token_lottery.total_tickets = 0;
        ctx.accounts.token_lottery.randomness_account = Pubkey::default();
        ctx.accounts.token_lottery.winner_chosen = false;
        ctx.accounts.token_lottery.ticket_price = 100;
        Ok(())
    }

    pub fn initialize_lottery(ctx: Context<InitializeLottery>) -> Result<()> {
        let signer_seeds: &[&[&[u8]]] =
            &[&[b"collection_mint".as_ref(), &[ctx.bumps.collection_mint]]];

        msg!("Creating mint account...");
        mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.collection_mint.to_account_info(),
                    to: ctx.accounts.collection_token_account.to_account_info(),
                    authority: ctx.accounts.collection_mint.to_account_info(),
                },
                signer_seeds,
            ),
            1,
        )?;

        msg!("Creating Metadata account...");
        create_metadata_accounts_v3(
            CpiContext::new_with_signer(
                ctx.accounts.token_metadata_program.to_account_info(),
                CreateMetadataAccountsV3 {
                    metadata: ctx.accounts.metadata.to_account_info(),
                    mint: ctx.accounts.collection_mint.to_account_info(),
                    mint_authority: ctx.accounts.collection_mint.to_account_info(),
                    payer: ctx.accounts.payer.to_account_info(),
                    update_authority: ctx.accounts.collection_mint.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                },
                signer_seeds,
            ),
            DataV2 {
                name: NAME.to_string(),
                symbol: SYMBOL.to_string(),
                uri: URI.to_string(),
                seller_fee_basis_points: 0,
                creators: Some(vec![Creator {
                    address: ctx.accounts.collection_mint.key(),
                    verified: false,
                    share: 100,
                }]),
                collection: None,
                uses: None,
            },
            true,
            true,
            Some(CollectionDetails::V1 { size: 0 }),
        )?;

        msg!("Creating Master Edition account...");
        create_master_edition_v3(
            CpiContext::new_with_signer(
                ctx.accounts.token_metadata_program.to_account_info(),
                CreateMasterEditionV3 {
                    payer: ctx.accounts.payer.to_account_info(),
                    mint: ctx.accounts.collection_mint.to_account_info(),
                    edition: ctx.accounts.master_edition.to_account_info(),
                    mint_authority: ctx.accounts.collection_mint.to_account_info(),
                    update_authority: ctx.accounts.collection_mint.to_account_info(),
                    metadata: ctx.accounts.metadata.to_account_info(),
                    token_program: ctx.accounts.token_program.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                },
                signer_seeds,
            ),
            Some(0),
        )?;

        msg!("Verifying collection...");
        sign_metadata(CpiContext::new_with_signer(
            ctx.accounts.token_metadata_program.to_account_info(),
            SignMetadata {
                creator: ctx.accounts.collection_mint.to_account_info(),
                metadata: ctx.accounts.metadata.to_account_info(),
            },
            signer_seeds,
        ))?;

        Ok(())
    }

    pub fn buy_ticket(ctx: Context<BuyTicket>) -> Result<()> {
        let clock = Clock::get()?;
        let ticket_name = NAME.to_owned()
            + ctx
                .accounts
                .token_lottery
                .total_tickets
                .to_string()
                .as_str();

        if clock.slot < ctx.accounts.token_lottery.start_time
            || clock.slot > ctx.accounts.token_lottery.end_time
        {
            return Err(ErrorCode::LotteryNotOpen.into());
        }

        transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.buyer.to_account_info(),
                    to: ctx.accounts.token_lottery.to_account_info(),
                },
            ),
            ctx.accounts.token_lottery.ticket_price,
        )?;

        let signer_seeds: &[&[&[u8]]] =
            &[&[b"collection_mint".as_ref(), &[ctx.bumps.collection_mint]]];

        mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.ticket_mint.to_account_info(),
                    to: ctx.accounts.destination.to_account_info(),
                    authority: ctx.accounts.collection_mint.to_account_info(),
                },
                signer_seeds,
            ),
            1,
        )?;

        msg!("Creating Metadata account...");
        create_metadata_accounts_v3(
            CpiContext::new_with_signer(
                ctx.accounts.token_metadata_program.to_account_info(),
                CreateMetadataAccountsV3 {
                    metadata: ctx.accounts.ticket_metadata.to_account_info(),
                    mint: ctx.accounts.ticket_mint.to_account_info(),
                    mint_authority: ctx.accounts.collection_mint.to_account_info(),
                    payer: ctx.accounts.buyer.to_account_info(),
                    update_authority: ctx.accounts.collection_mint.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                },
                signer_seeds,
            ),
            DataV2 {
                name: ticket_name,
                symbol: SYMBOL.to_string(),
                uri: URI.to_string(),
                seller_fee_basis_points: 0,
                creators: None,
                collection: None,
                uses: None,
            },
            true,
            true,
            None,
        )?;

        msg!("Creating Master Edition account...");
        create_master_edition_v3(
            CpiContext::new_with_signer(
                ctx.accounts.token_metadata_program.to_account_info(),
                CreateMasterEditionV3 {
                    payer: ctx.accounts.buyer.to_account_info(),
                    mint: ctx.accounts.ticket_mint.to_account_info(),
                    edition: ctx.accounts.ticket_master_edition.to_account_info(),
                    mint_authority: ctx.accounts.collection_mint.to_account_info(),
                    update_authority: ctx.accounts.collection_mint.to_account_info(),
                    metadata: ctx.accounts.ticket_metadata.to_account_info(),
                    token_program: ctx.accounts.token_program.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                },
                signer_seeds,
            ),
            Some(0),
        )?;

        set_and_verify_sized_collection_item(
            CpiContext::new_with_signer(
                ctx.accounts.token_metadata_program.to_account_info(),
                SetAndVerifySizedCollectionItem {
                    metadata: ctx.accounts.ticket_metadata.to_account_info(),
                    collection_authority: ctx.accounts.collection_mint.to_account_info(),
                    payer: ctx.accounts.buyer.to_account_info(),
                    collection_mint: ctx.accounts.collection_mint.to_account_info(),
                    collection_metadata: ctx.accounts.collection_metadata.to_account_info(),
                    collection_master_edition: ctx
                        .accounts
                        .collection_master_edition
                        .to_account_info(),
                    update_authority: ctx.accounts.collection_mint.to_account_info(),
                },
                signer_seeds,
            ),
            None,
        )?;

        ctx.accounts.token_lottery.total_tickets += 1;

        Ok(())
    }

    pub fn commit_randomness(ctx: Context<CommitRandomness>) -> Result<()> {
        let clock = Clock::get()?;
        let token_lottery = &mut ctx.accounts.token_lottery;

        if ctx.accounts.randomness_account.key() != token_lottery.authority {
            return Err(ErrorCode::Unauthorized.into());
        }

        let randomness_data =
            RandomnessAccountData::parse(ctx.accounts.randomness_account.data.borrow()).unwrap();

        if randomness_data.seed_slot != clock.slot - 1 {
            return Err(ErrorCode::RandomnessAlreadyRevealed.into());
        }

        token_lottery.randomness_account = ctx.accounts.randomness_account.key();

        Ok(())
    }

    pub fn reveal_winner(ctx: Context<RevealWinner>) -> Result<()> {
        let clock = Clock::get()?;
        let token_lottery = &mut ctx.accounts.token_lottery;

        if ctx.accounts.randomness_account.key() != token_lottery.randomness_account {
            return Err(ErrorCode::IncorrectRandomnessAccount.into());
        }
        if ctx.accounts.payer.key() != token_lottery.authority {
            return Err(ErrorCode::Unauthorized.into());
        }
        if clock.slot < token_lottery.end_time {
            msg!("Current slot: {}", clock.slot);
            msg!("End slot: {}", token_lottery.end_time);
            return Err(ErrorCode::LotteryNotCompleted.into());
        }
        require!(
            token_lottery.winner_chosen == false,
            ErrorCode::WinnerChosen
        );

        let randomness_data =
            RandomnessAccountData::parse(ctx.accounts.randomness_account.data.borrow()).unwrap();
        let revealed_random_value = randomness_data
            .get_value(clock.slot)
            .map_err(|_| ErrorCode::RandomnessNotResolved)?;

        msg!("Randomness result: {}", revealed_random_value[0]);
        msg!("Ticket num: {}", token_lottery.total_tickets);

        let randomness_result = revealed_random_value[0] as u64 % token_lottery.total_tickets;

        msg!("Winner: {}", randomness_result);
        msg!("Current slot: {}", clock.slot);
        token_lottery.winner = randomness_result;
        token_lottery.winner_chosen = true;

        Ok(())
    }

    pub fn claim_winnings(ctx: Context<ClaimWinnings>) -> Result<()> {
        require!(
            ctx.accounts.token_lottery.winner_chosen,
            ErrorCode::WinnerNotChosen
        );

        // Check if token is a part of the collection
        require!(
            ctx.accounts.metadata.collection.as_ref().unwrap().verified,
            ErrorCode::NotVerifiedTicket
        );
        require!(
            ctx.accounts.metadata.collection.as_ref().unwrap().key
                == ctx.accounts.collection_mint.key(),
            ErrorCode::IncorrectTicket
        );

        let ticket_name = NAME.to_owned() + &ctx.accounts.token_lottery.winner.to_string();
        let metadata_name = ctx.accounts.metadata.name.replace("\u{0}", "");

        msg!("Ticket name: {}", ticket_name);
        msg!("Metdata name: {}", metadata_name);

        // Check if the winner has the winning ticket
        require!(metadata_name == ticket_name, ErrorCode::IncorrectTicket);
        require!(
            ctx.accounts.destination.amount > 0,
            ErrorCode::IncorrectTicket
        );

        **ctx
            .accounts
            .token_lottery
            .to_account_info()
            .try_borrow_mut_lamports()? -= ctx.accounts.token_lottery.lottery_pot_amount;
        **ctx.accounts.payer.try_borrow_mut_lamports()? +=
            ctx.accounts.token_lottery.lottery_pot_amount;

        ctx.accounts.token_lottery.lottery_pot_amount = 0;

        Ok(())
    }
}

#[error_code]
pub enum ErrorCode {
    #[msg("The lottery is not open for ticket purchases.")]
    LotteryNotOpen,

    #[msg("Unauthorized: Only the lottery authority can perform this action.")]
    Unauthorized,

    #[msg("Randomness has already been revealed for the current seed slot.")]
    RandomnessAlreadyRevealed,

    #[msg("The provided randomness account is incorrect.")]
    IncorrectRandomnessAccount,

    #[msg("The winner has already been chosen.")]
    WinnerChosen,

    #[msg("The lottery has not completed yet.")]
    LotteryNotCompleted,

    #[msg("Randomness is not resolved yet.")]
    RandomnessNotResolved,

    #[msg("The winner has not been chosen yet.")]
    WinnerNotChosen,

    #[msg("The provided ticket is not verified as part of the collection.")]
    NotVerifiedTicket,

    #[msg("The provided ticket does not match the winning ticket.")]
    IncorrectTicket,
}
