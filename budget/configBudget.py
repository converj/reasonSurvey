import configuration as baseConf  # Import from parent directory requires that this file has a different name from file in parent dir.


const = baseConf.const   # Callers can import only this file and get both base and local constants via "const" variable

const.minLengthBudgetIntro = 30
const.minLengthSliceTitle = 3
const.minLengthSliceReason = 30

const.SLICE_SIZE_STEP = 5
const.SLICE_SIZE_MIN = 0
const.SLICE_SIZE_MAX = 100
const.SLICE_SIZE_SUM_MAX = 100

const.BUDGET_CLASS_NAME = 'Budget'
const.SLICE_CLASS_NAME = 'Slice'


