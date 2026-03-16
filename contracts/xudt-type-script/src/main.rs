#![no_std]
#![no_main]
#![feature(lang_items)]
#![feature(alloc_error_handler)]
#![feature(panic_info_message)]

mod error;
mod validator;

use ckb_std::default_alloc;

// Use the default CKB allocator for heap allocations in no_std environment.
default_alloc!();

use ckb_std::entry;
use error::Error;

/// Program entry point. CKB invokes this when the type script executes.
/// Returns 0 on success, non-zero error code on failure.
fn program_entry() -> i8 {
    match validator::validate() {
        Ok(()) => 0,
        Err(err) => err as i8,
    }
}

entry!(program_entry);
