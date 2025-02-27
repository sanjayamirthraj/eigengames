use crate::{
    ParallelExecTaskManager, ProcessorError, PARALLEL_EXEC_TASK_MANAGER_ABI_STRING,
};

#[job(
    id = 0,
    params(task_created_block, quorum_numbers, quorum_threshold_percentage, task_index),
    event_listener(
        listener = EvmContractEventListener<ParallelExecContext, ParallelExecTaskManager::NewTaskCreated>,
        instance = ParallelExecTaskManager,
        abi = PARALLEL_EXEC_TASK_MANAGER_ABI_STRING,
        pre_processor = convert_event_to_inputs,
    ),
)] 