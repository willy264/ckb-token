#![no_std]
#![no_main]

use ckb_std::entry;
use ckb_std::default_alloc;
use ckb_std::error::SysError;

default_alloc!();
entry!(program_entry);

fn program_entry() -> i8 {
    match verify() {
        Ok(_) => 0,
        Err(e) => e as i8,
    }
}

#[repr(i8)]
enum Error {
    IndexOutOfBound = 1,
    ItemMissing,
    LengthNotEnough,
    Encoding,
    InvalidSignature,
}

impl From<SysError> for Error {
    fn from(err: SysError) -> Self {
        match err {
            SysError::IndexOutOfBound => Error::IndexOutOfBound,
            SysError::ItemMissing => Error::ItemMissing,
            SysError::LengthNotEnough(_) => Error::LengthNotEnough,
            SysError::Encoding => Error::Encoding,
            _ => Error::Encoding,
        }
    }
}

fn verify() -> Result<(), Error> {
    Ok(())
}