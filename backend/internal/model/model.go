package model

import "time"

type StaffRole string

const (
	RoleManager    StaffRole = "manager"
	RolePharmacist StaffRole = "pharmacist"
	RoleCashier     StaffRole = "cashier"
)

type Staff struct {
	ID              string    `json:"id"`
	Username        string    `json:"username"`
	Name            string    `json:"name"`
	PasswordHash    string    `json:"-"`
	Role            StaffRole `json:"role"`
	Phone           string    `json:"phone"`
	Locked          bool      `json:"locked"`
	LastPasswordChange time.Time `json:"last_password_change"`
	PasswordExpiresAt  time.Time `json:"password_expires_at"`
	CreatedAt       time.Time `json:"created_at"`
}

type DrugCategory string

const (
	DrugCategoryColdChain DrugCategory = "cold_chain"
	DrugCategoryNormal  DrugCategory = "normal"
)

type Drug struct {
	ID            string       `json:"id"`
	ProductName   string       `json:"product_name"`
	GenericName   string       `json:"generic_name"`
	GenericNameEn string       `json:"generic_name_en"`
	Specification string       `json:"specification"`
	Manufacturer  string       `json:"manufacturer"`
	IsPrescription bool         `json:"is_prescription"`
	Category      DrugCategory `json:"category"`
	StockMin      int          `json:"stock_min"`
	StockMax      int          `json:"stock_max"`
	CostPrice     float64      `json:"cost_price,omitempty"`
	SalePrice     float64      `json:"sale_price"`
	InsuranceType string       `json:"insurance_type"`
	CreatedAt     time.Time    `json:"created_at"`
	UpdatedAt     time.Time    `json:"updated_at"`
	TotalStock    int          `json:"total_stock"`
}

type DrugBatch struct {
	ID             string    `json:"id"`
	DrugID         string    `json:"drug_id"`
	BatchNo        string    `json:"batch_no"`
	ExpiryDate     time.Time `json:"expiry_date"`
	Stock          int       `json:"stock"`
	InDate         time.Time `json:"in_date"`
	InOperator     string    `json:"in_operator"`
	Locked         bool      `json:"locked"`
	LockedReason   string    `json:"locked_reason,omitempty"`
}

type TemperatureRecord struct {
	ID        string    `json:"id"`
	DrugID    string    `json:"drug_id"`
	BatchID   string    `json:"batch_id"`
	Temp      float64   `json:"temp"`
	RecordTime time.Time `json:"record_time"`
	SensorID  string    `json:"sensor_id"`
}

type RxStatus string

const (
	RxStatusCreated   RxStatus = "created"
	RxStatusVerified RxStatus = "verified"
	RxStatusDispensed RxStatus = "dispensed"
	RxStatusInsurance RxStatus = "insurance_submitted"
	RxStatusCompleted RxStatus = "completed"
	RxStatusVoid    RxStatus = "void"
)

type RxItem struct {
	DrugID    string  `json:"drug_id"`
	DrugName  string  `json:"drug_name"`
	Specification string `json:"specification"`
	Quantity  int     `json:"quantity"`
	UnitPrice float64 `json:"unit_price"`
	Amount    float64 `json:"amount"`
	BatchIDs  []string `json:"batch_ids,omitempty"`
}

type RxActionLog struct {
	Action    string    `json:"action"`
	OperatorID string   `json:"operator_id"`
	OperatorName string `json:"operator_name"`
	Timestamp time.Time `json:"timestamp"`
	Remark    string    `json:"remark,omitempty"`
}

type Rx struct {
	ID                string      `json:"id"`
	RxNo              string      `json:"rx_no"`
	PatientName       string      `json:"patient_name"`
	PatientIDCard    string      `json:"patient_id_card"`
	DoctorName        string      `json:"doctor_name"`
	Hospital          string      `json:"hospital"`
	Items             []RxItem    `json:"items"`
	TotalAmount       float64     `json:"total_amount"`
	InsuranceAmount   float64     `json:"insurance_amount"`
	SelfPayAmount     float64     `json:"self_pay_amount"`
	Status            RxStatus    `json:"status"`
	OperatorID        string      `json:"operator_id"`
	OperatorName      string      `json:"operator_name"`
	CurrentHolderID     string      `json:"current_holder_id"`
	CurrentHolderName   string      `json:"current_holder_name"`
	HandoverPending  bool        `json:"handover_pending"`
	HandoverFromID    string      `json:"handover_from_id,omitempty"`
	HandoverToID      string      `json:"handover_to_id,omitempty"`
	InsuranceClaimNo      string      `json:"insurance_claim_no,omitempty"`
	Actions           []RxActionLog `json:"actions"`
	QrCode            string      `json:"qr_code"`
	IsVoid            bool        `json:"is_void"`
	VoidReason        string      `json:"void_reason,omitempty"`
	CreatedAt         time.Time   `json:"created_at"`
	UpdatedAt         time.Time   `json:"updated_at"`
}

type InsuranceCatalogItem struct {
	ID           string  `json:"id"`
	DrugID       string  `json:"drug_id"`
	DrugName     string  `json:"drug_name"`
	GenericName  string  `json:"generic_name"`
	Category     string  `json:"category"`
	SelfPayRatio float64 `json:"self_pay_ratio"`
	MaxPrice     float64 `json:"max_price"`
}

type InsuranceSettlement struct {
	ID              string    `json:"id"`
	Period          string    `json:"period"`
	TotalAmount      float64   `json:"total_amount"`
	InsuranceAmount float64   `json:"insurance_amount"`
	SelfPayAmount    float64   `json:"self_pay_amount"`
	ReceivedAmount     float64   `json:"received_amount"`
	DiffAmount       float64   `json:"diff_amount"`
	RxCount         int       `json:"rx_count"`
	Status          string    `json:"status"`
	CreatedAt       time.Time `json:"created_at"`
}

type InsuranceDiscrepancy struct {
	ID                 string    `json:"id"`
	SettlementID       string    `json:"settlement_id"`
	RxID               string    `json:"rx_id"`
	RxNo               string    `json:"rx_no"`
	BatchNo            string    `json:"batch_no,omitempty"`
	StoreOrderNo       string    `json:"store_order_no"`
	UpstreamReceiptNo  string    `json:"upstream_receipt_no"`
	ExpectedAmount    float64   `json:"expected_amount"`
	ActualAmount      float64   `json:"actual_amount"`
	DiffAmount         float64   `json:"diff_amount"`
	Reason             string    `json:"reason,omitempty"`
	CreatedAt          time.Time `json:"created_at"`
}

type ShiftType string

const (
	ShiftMorning ShiftType = "morning"
	ShiftNoon    ShiftType = "noon"
	ShiftEvening   ShiftType = "evening"
)

type Shift struct {
	ID        string    `json:"id"`
	Date      string    `json:"date"`
	ShiftType ShiftType `json:"shift_type"`
	StaffID   string    `json:"staff_id"`
	StaffName string    `json:"staff_name"`
	CreatedAt time.Time `json:"created_at"`
}

type SwapStatus string

const (
	SwapPending    SwapStatus = "pending"
	SwapConfirmed  SwapStatus = "confirmed"
	SwapApproved   SwapStatus = "approved"
	SwapRejected    SwapStatus = "rejected"
	SwapExpired    SwapStatus = "expired"
	SwapCancelled SwapStatus = "cancelled"
)

type SwapRequest struct {
	ID          string    `json:"id"`
	ShiftID     string    `json:"shift_id"`
	ShiftDate   string    `json:"shift_date"`
	ShiftType   ShiftType `json:"shift_type"`
	RequesterID string    `json:"requester_id"`
	RequesterName string  `json:"requester_name"`
	TargetStaffID string   `json:"target_staff_id"`
	TargetStaffName string `json:"target_staff_name"`
	Status      SwapStatus `json:"status"`
	Reason      string    `json:"reason,omitempty"`
	RejectReason string   `json:"reject_reason,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	ExpiresAt   time.Time `json:"expires_at"`
}

type TransferStatus string

const (
	TransferPending   TransferStatus = "pending"
	TransferSignedOut TransferStatus = "signed_out"
	TransferSignedIn  TransferStatus = "signed_in"
	TransferVoid        TransferStatus = "void"
)

type TransferItem struct {
	DrugID   string `json:"drug_id"`
	DrugName string `json:"drug_name"`
	Specification string `json:"specification"`
	BatchID  string `json:"batch_id"`
	BatchNo  string `json:"batch_no"`
	Quantity int    `json:"quantity"`
}

type DrugTransfer struct {
	ID              string         `json:"id"`
	TransferNo      string         `json:"transfer_no"`
	FromStoreID     string         `json:"from_store_id"`
	FromStoreName   string         `json:"from_store_name"`
	ToStoreID       string         `json:"to_store_id"`
	ToStoreName     string         `json:"to_store_name"`
	Items           []TransferItem `json:"items"`
	Status          TransferStatus `json:"status"`
	SignOutOperatorID   string     `json:"sign_out_operator_id,omitempty"`
	SignOutOperatorName string   `json:"sign_out_operator_name,omitempty"`
	SignOutTime     time.Time    `json:"sign_out_time,omitempty"`
	SignInOperatorID    string     `json:"sign_in_operator_id,omitempty"`
	SignInOperatorName string   `json:"sign_in_operator_name,omitempty"`
	SignInTime      time.Time    `json:"sign_in_time,omitempty"`
	CreatedAt       time.Time    `json:"created_at"`
}

type GSPLedgerRecord struct {
	ID            string    `json:"id"`
	Date          string    `json:"date"`
	Type          string    `json:"type"`
	DrugID        string    `json:"drug_id"`
	DrugName      string    `json:"drug_name"`
	Specification string    `json:"specification"`
	BatchNo       string    `json:"batch_no"`
	ExpiryDate    string    `json:"expiry_date"`
	Quantity      int       `json:"quantity"`
	Balance       int       `json:"balance"`
	Operator      string    `json:"operator"`
	Remark        string    `json:"remark"`
	RxNo          string    `json:"rx_no,omitempty"`
	Temperature   *float64  `json:"temperature,omitempty"`
}
