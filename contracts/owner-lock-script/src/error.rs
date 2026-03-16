/// Error codes for the owner lock script.
#[repr(i8)]
pub enum Error {
    IndexOutOfBound = 1,
    ItemMissing = 2,
    LengthNotEnough = 3,
    Encoding = 4,
    InvalidSignature = 5,
    InvalidPubkey = 6,
    WitnessNotFound = 7,
}

impl From<ckb_std::error::SysError> for Error {
    fn from(err: ckb_std::error::SysError) -> Self {
        use ckb_std::error::SysError;
        match err {
            SysError::IndexOutOfBound => Error::IndexOutOfBound,
            SysError::ItemMissing => Error::ItemMissing,
            SysError::LengthNotEnough(_) => Error::LengthNotEnough,
            SysError::Encoding => Error::Encoding,
            SysError::Unknown(_) => Error::Encoding,
            _ => Error::Encoding,
        }
    }
}
