/// Error codes for the xUDT type script.
/// CKB scripts return non-zero values to indicate errors.
/// We reserve 0 for success and use small positive integers for our errors.
#[repr(i8)]
pub enum Error {
  IndexOutOfBound = 1,
  ItemMissing = 2,
  LengthNotEnough = 3,
  Encoding = 4,
  AmountOverflow = 5,
  InsufficientInputAmount = 6,
  InvalidOwnerLock = 7,
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
