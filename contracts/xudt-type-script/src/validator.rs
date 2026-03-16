use crate::error::Error;
use ckb_std::{
    ckb_constants::Source,
    high_level::{load_cell_data, load_cell_lock_hash, load_cell_type_hash, load_script, QueryIter},
};
use ckb_std::ckb_types::prelude::Entity;

/// Size of a Uint128 value in bytes (little-endian encoded).
const UINT128_SIZE: usize = 16;

/// Decode a little-endian Uint128 from a byte slice.
/// The slice must be at least 16 bytes long.
fn decode_uint128(data: &[u8]) -> Result<u128, Error> {
    if data.len() < UINT128_SIZE {
        return Err(Error::LengthNotEnough);
    }
    let mut buf = [0u8; 16];
    buf.copy_from_slice(&data[..UINT128_SIZE]);
    Ok(u128::from_le_bytes(buf))
}

/// Get the current script's type hash for matching cells.
fn current_script_hash() -> Result<[u8; 32], Error> {
    let script = load_script()?;
    let hash = script.calc_script_hash();
    let mut result = [0u8; 32];
    result.copy_from_slice(hash.as_slice());
    Ok(result)
}

/// Sum token amounts from all input cells that have the same Type Script as this script.
pub fn sum_input_token_amounts() -> Result<u128, Error> {
    let script_hash = current_script_hash()?;
    let mut total: u128 = 0;

    for (i, type_hash) in QueryIter::new(load_cell_type_hash, Source::Input).enumerate() {
        if let Some(hash) = type_hash {
            if hash == script_hash {
                let data = load_cell_data(i, Source::Input)?;
                let amount = decode_uint128(&data)?;
                total = total.checked_add(amount).ok_or(Error::AmountOverflow)?;
            }
        }
    }

    Ok(total)
}

/// Sum token amounts from all output cells that have the same Type Script as this script.
pub fn sum_output_token_amounts() -> Result<u128, Error> {
    let script_hash = current_script_hash()?;
    let mut total: u128 = 0;

    for (i, type_hash) in QueryIter::new(load_cell_type_hash, Source::Output).enumerate() {
        if let Some(hash) = type_hash {
            if hash == script_hash {
                let data = load_cell_data(i, Source::Output)?;
                let amount = decode_uint128(&data)?;
                total = total.checked_add(amount).ok_or(Error::AmountOverflow)?;
            }
        }
    }

    Ok(total)
}

/// Check if the owner lock is present in the transaction inputs.
/// The owner lock hash is stored in the first 32 bytes of the Type Script's args field.
pub fn check_owner_lock_present() -> Result<bool, Error> {
    let script = load_script()?;
    let binding = script.args().raw_data();
    let args: &[u8] = binding.as_ref();

    if args.len() < 32 {
        return Err(Error::InvalidOwnerLock);
    }

    let mut owner_lock_hash = [0u8; 32];
    owner_lock_hash.copy_from_slice(&args[..32]);

    for lock_hash in QueryIter::new(load_cell_lock_hash, Source::Input) {
        if lock_hash == owner_lock_hash {
            return Ok(true);
        }
    }

    Ok(false)
}

/// Main validation logic for xUDT transactions.
/// Enforces the following rules:
/// - If output_amount > input_amount (mint): owner lock must be present
/// - If output_amount == input_amount (transfer): always valid
/// - If output_amount < input_amount (burn): always valid (anyone can burn their own tokens)
pub fn validate() -> Result<(), Error> {
    let input_amount = sum_input_token_amounts()?;
    let output_amount = sum_output_token_amounts()?;

    if output_amount > input_amount {
        // Minting: only allowed if the owner lock is present in inputs
        let owner_present = check_owner_lock_present()?;
        if !owner_present {
            return Err(Error::InvalidOwnerLock);
        }
    }

    // Transfer (equal amounts) and burn (output < input) are always valid
    Ok(())
}
