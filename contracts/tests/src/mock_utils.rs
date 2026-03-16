use ckb_testtool::ckb_types::{
    bytes::Bytes,
    core::{TransactionBuilder, TransactionView},
    packed::{self, CellDep, CellInput, CellOutput, OutPoint, Script, WitnessArgs},
    prelude::*,
};
use ckb_testtool::context::Context;

/// Encode a u128 value as 16-byte little-endian Uint128 (matching on-chain format).
pub fn encode_uint128(amount: u128) -> Bytes {
    Bytes::from(amount.to_le_bytes().to_vec())
}

/// Create a type script with the given code hash (from deployed binary) and args.
pub fn build_type_script(context: &mut Context, out_point: &OutPoint, args: Bytes) -> Script {
    context
        .build_script(out_point, args)
        .expect("build type script")
}

/// Create a lock script from a deployed binary.
pub fn build_lock_script(context: &mut Context, out_point: &OutPoint, args: Bytes) -> Script {
    context
        .build_script(out_point, args)
        .expect("build lock script")
}

/// Helper to create a cell output with given capacity and optional type script.
pub fn build_cell_output(
    capacity: u64,
    lock: Script,
    type_script: Option<Script>,
) -> CellOutput {
    let builder = CellOutput::new_builder()
        .capacity(capacity.pack())
        .lock(lock);
    match type_script {
        Some(ts) => builder.type_(Some(ts).pack()).build(),
        None => builder.build(),
    }
}

/// Build a mint transaction.
/// - owner_cell: the cell with the owner lock (proves minting authority)
/// - outputs: the newly minted UDT cells
pub fn build_mint_tx(
    owner_input: CellInput,
    owner_output: CellOutput,
    owner_output_data: Bytes,
    udt_output: CellOutput,
    udt_output_data: Bytes,
    xudt_dep: CellDep,
    owner_lock_dep: CellDep,
) -> TransactionView {
    let witness = WitnessArgs::new_builder().build();

    TransactionBuilder::default()
        .input(owner_input)
        .output(owner_output)
        .output_data(owner_output_data.pack())
        .output(udt_output)
        .output_data(udt_output_data.pack())
        .cell_dep(xudt_dep)
        .cell_dep(owner_lock_dep)
        .witness(witness.as_bytes().pack())
        .build()
}

/// Build a transfer transaction.
/// - input_cells: UDT cells being consumed
/// - outputs: UDT cells being created (recipient + change)
pub fn build_transfer_tx(
    inputs: Vec<CellInput>,
    outputs: Vec<CellOutput>,
    outputs_data: Vec<Bytes>,
    xudt_dep: CellDep,
    lock_dep: CellDep,
) -> TransactionView {
    let witness = WitnessArgs::new_builder().build();

    let mut builder = TransactionBuilder::default()
        .cell_dep(xudt_dep)
        .cell_dep(lock_dep);

    for input in inputs {
        builder = builder.input(input);
    }

    for (output, data) in outputs.into_iter().zip(outputs_data.into_iter()) {
        builder = builder.output(output).output_data(data.pack());
    }

    builder.witness(witness.as_bytes().pack()).build()
}

/// Build a burn transaction.
/// Input amount > output amount = tokens are burned.
pub fn build_burn_tx(
    inputs: Vec<CellInput>,
    outputs: Vec<CellOutput>,
    outputs_data: Vec<Bytes>,
    xudt_dep: CellDep,
    lock_dep: CellDep,
) -> TransactionView {
    build_transfer_tx(inputs, outputs, outputs_data, xudt_dep, lock_dep)
}

/// Create an input cell in the context and return its CellInput.
pub fn create_input_cell(
    context: &mut Context,
    cell_output: CellOutput,
    data: Bytes,
) -> (OutPoint, CellInput) {
    let out_point = context.create_cell(cell_output, data);
    let input = CellInput::new_builder()
        .previous_output(out_point.clone())
        .since(0u64.pack())
        .build();
    (out_point, input)
}
