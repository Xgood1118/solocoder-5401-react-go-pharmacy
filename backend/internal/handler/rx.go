package handler

import (
	"net/http"
	"strconv"
	"sync"
	"time"

	"pharmacy/internal/model"
	"pharmacy/internal/store"

	"github.com/gin-gonic/gin"
)

var rxMutex sync.Map

type RxHandler struct {
	store *store.MemoryStore
}

func NewRxHandler(s *store.MemoryStore) *RxHandler {
	return &RxHandler{store: s}
}

func (h *RxHandler) ListRx(c *gin.Context) {
	status := c.Query("status")
	staffID, _ := c.Get("staff_id")
	myOnly := c.Query("my_only")

	if myOnly == "true" {
		rxes := h.store.ListRx(status, staffID.(string))
		c.JSON(http.StatusOK, rxes)
	} else {
		rxes := h.store.ListRx(status, "")
		c.JSON(http.StatusOK, rxes)
	}
}

func (h *RxHandler) GetRx(c *gin.Context) {
	id := c.Param("id")
	rx, exists := h.store.GetRx(id)
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "处方不存在"})
		return
	}
	c.JSON(http.StatusOK, rx)
}

type CreateRxItem struct {
	DrugID   string `json:"drug_id" binding:"required"`
	Quantity int    `json:"quantity" binding:"required,min=1"`
}

type CreateRxRequest struct {
	PatientName    string          `json:"patient_name" binding:"required"`
	PatientIDCard  string          `json:"patient_id_card" binding:"required"`
	DoctorName     string          `json:"doctor_name"`
	Hospital       string          `json:"hospital"`
	Items          []CreateRxItem  `json:"items" binding:"required,min=1"`
	QrCode         string          `json:"qr_code"`
}

func (h *RxHandler) CreateRx(c *gin.Context) {
	var req CreateRxRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误"})
		return
	}

	if len(req.PatientIDCard) < 15 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "身份证号格式不正确"})
		return
	}

	staffID, _ := c.Get("staff_id")
	staffName := ""
	if staff, ok := h.store.GetStaff(staffID.(string)); ok {
		staffName = staff.Name
	}

	rxItems := make([]model.RxItem, 0, len(req.Items))
	totalAmount := 0.0

	for _, item := range req.Items {
		drug, exists := h.store.GetDrug(item.DrugID)
		if !exists {
			c.JSON(http.StatusBadRequest, gin.H{"error": "药品不存在: " + item.DrugID})
			return
		}

		if drug.IsPrescription {
		}

		amount := drug.SalePrice * float64(item.Quantity)
		totalAmount += amount

		rxItems = append(rxItems, model.RxItem{
			DrugID:        drug.ID,
			DrugName:      drug.ProductName,
			Specification: drug.Specification,
			Quantity:      item.Quantity,
			UnitPrice:     drug.SalePrice,
			Amount:        amount,
		})
	}

	now := time.Now()
	rxID := "rx-" + strconv.FormatInt(now.Unix(), 10)
	rxNo := "RX" + now.Format("20060102") + strconv.Itoa(int(now.Unix()%1000))

	insuranceAmount, selfPayAmount := h.calcInsurance(rxItems)

	rx := &model.Rx{
		ID:                rxID,
		RxNo:              rxNo,
		PatientName:       req.PatientName,
		PatientIDCard:     req.PatientIDCard,
		DoctorName:        req.DoctorName,
		Hospital:          req.Hospital,
		Items:             rxItems,
		TotalAmount:       totalAmount,
		InsuranceAmount:   insuranceAmount,
		SelfPayAmount:     selfPayAmount,
		Status:            model.RxStatusCreated,
		OperatorID:        staffID.(string),
		OperatorName:      staffName,
		CurrentHolderID:   staffID.(string),
		CurrentHolderName: staffName,
		QrCode:            req.QrCode,
		Actions: []model.RxActionLog{
			{
				Action:       "创建处方",
				OperatorID:   staffID.(string),
				OperatorName: staffName,
				Timestamp:    now,
			},
		},
		CreatedAt: now,
		UpdatedAt: now,
	}

	h.store.AddRx(rx)

	c.JSON(http.StatusCreated, rx)
}

func (h *RxHandler) calcInsurance(items []model.RxItem) (float64, float64) {
	insuranceAmount := 0.0
	selfPayAmount := 0.0

	for _, item := range items {
		catalogItem, exists := h.store.GetCatalogByDrugID(item.DrugID)
		if !exists {
			selfPayAmount += item.Amount
			continue
		}

		switch catalogItem.Category {
		case "甲类":
			insuranceAmount += item.Amount
		case "乙类":
			self := item.Amount * catalogItem.SelfPayRatio
			selfPayAmount += self
			insuranceAmount += item.Amount - self
		case "丙类":
			fallthrough
		default:
			selfPayAmount += item.Amount
		}
	}

	return insuranceAmount, selfPayAmount
}

func (h *RxHandler) VerifyRx(c *gin.Context) {
	id := c.Param("id")

	mu, _ := rxMutex.LoadOrStore(id, &sync.Mutex{})
	m := mu.(*sync.Mutex)
	m.Lock()
	defer m.Unlock()

	rx, exists := h.store.GetRx(id)
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "处方不存在"})
		return
	}

	if rx.IsVoid {
		c.JSON(http.StatusBadRequest, gin.H{"error": "处方已作废"})
		return
	}

	if rx.Status != model.RxStatusCreated {
		c.JSON(http.StatusBadRequest, gin.H{"error": "处方状态不正确，当前状态: " + string(rx.Status)})
		return
	}

	staffID, _ := c.Get("staff_id")
	if rx.CurrentHolderID != staffID.(string) || rx.HandoverPending {
		c.JSON(http.StatusForbidden, gin.H{"error": "您没有操作权限，请先接收处方交接"})
		return
	}

	staffName := ""
	if staff, ok := h.store.GetStaff(staffID.(string)); ok {
		staffName = staff.Name
	}

	now := time.Now()
	rx.Status = model.RxStatusVerified
	rx.Actions = append(rx.Actions, model.RxActionLog{
		Action:       "核方通过",
		OperatorID:   staffID.(string),
		OperatorName: staffName,
		Timestamp:    now,
	})
	rx.UpdatedAt = now

	h.store.UpdateRx(rx)

	c.JSON(http.StatusOK, rx)
}

func (h *RxHandler) DispenseRx(c *gin.Context) {
	id := c.Param("id")

	mu, _ := rxMutex.LoadOrStore(id, &sync.Mutex{})
	m := mu.(*sync.Mutex)
	m.Lock()
	defer m.Unlock()

	rx, exists := h.store.GetRx(id)
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "处方不存在"})
		return
	}

	if rx.IsVoid {
		c.JSON(http.StatusBadRequest, gin.H{"error": "处方已作废"})
		return
	}

	if rx.Status != model.RxStatusVerified {
		c.JSON(http.StatusBadRequest, gin.H{"error": "处方状态不正确，当前状态: " + string(rx.Status)})
		return
	}

	staffID, _ := c.Get("staff_id")
	if rx.CurrentHolderID != staffID.(string) || rx.HandoverPending {
		c.JSON(http.StatusForbidden, gin.H{"error": "您没有操作权限，请先接收处方交接"})
		return
	}

	for _, item := range rx.Items {
		batches := h.store.GetBatches(item.DrugID)
		availableStock := 0
		for _, b := range batches {
			if !b.Locked {
				availableStock += b.Stock
			}
		}
		if availableStock < item.Quantity {
			c.JSON(http.StatusBadRequest, gin.H{"error": "药品库存不足: " + item.DrugName})
			return
		}
	}

	for i, item := range rx.Items {
		deductBatchIDs, _, err := h.store.DeductStockFIFO(item.DrugID, item.Quantity)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "扣减库存失败"})
			return
		}
		rx.Items[i].BatchIDs = deductBatchIDs

		drug, _ := h.store.GetDrug(item.DrugID)
		now := time.Now()
		ledgerRec := &model.GSPLedgerRecord{
			ID:            "ledger-" + strconv.FormatInt(now.Unix(), 10) + "-" + strconv.Itoa(i),
			Date:          now.Format("2006-01-02"),
			Type:          "出库",
			DrugID:        item.DrugID,
			DrugName:      item.DrugName,
			Specification: item.Specification,
			BatchNo:       "",
			ExpiryDate:    "",
			Quantity:      -item.Quantity,
			Balance:       drug.TotalStock,
			Operator:      staffID.(string),
			Remark:        "处方发药",
			RxNo:          rx.RxNo,
		}
		h.store.AddLedgerRecord(ledgerRec)
	}

	staffName := ""
	if staff, ok := h.store.GetStaff(staffID.(string)); ok {
		staffName = staff.Name
	}

	now := time.Now()
	rx.Status = model.RxStatusDispensed
	rx.Actions = append(rx.Actions, model.RxActionLog{
		Action:       "发药",
		OperatorID:   staffID.(string),
		OperatorName: staffName,
		Timestamp:    now,
	})
	rx.UpdatedAt = now

	h.store.UpdateRx(rx)

	c.JSON(http.StatusOK, rx)
}

func (h *RxHandler) SubmitInsurance(c *gin.Context) {
	id := c.Param("id")

	rx, exists := h.store.GetRx(id)
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "处方不存在"})
		return
	}

	if rx.IsVoid {
		c.JSON(http.StatusBadRequest, gin.H{"error": "处方已作废"})
		return
	}

	if rx.Status != model.RxStatusDispensed {
		c.JSON(http.StatusBadRequest, gin.H{"error": "处方状态不正确，当前状态: " + string(rx.Status)})
		return
	}

	staffID, _ := c.Get("staff_id")
	staffName := ""
	if staff, ok := h.store.GetStaff(staffID.(string)); ok {
		staffName = staff.Name
	}

	now := time.Now()
	claimNo := "INS" + now.Format("20060102") + strconv.Itoa(int(now.Unix()%1000))

	rx.Status = model.RxStatusInsurance
	rx.InsuranceClaimNo = claimNo
	rx.Actions = append(rx.Actions, model.RxActionLog{
		Action:       "医保上传",
		OperatorID:   staffID.(string),
		OperatorName: staffName,
		Timestamp:    now,
	})
	rx.UpdatedAt = now

	h.store.UpdateRx(rx)

	c.JSON(http.StatusOK, rx)
}

type VoidRxRequest struct {
	Reason string `json:"reason" binding:"required"`
}

func (h *RxHandler) VoidRx(c *gin.Context) {
	id := c.Param("id")

	mu, _ := rxMutex.LoadOrStore(id, &sync.Mutex{})
	m := mu.(*sync.Mutex)
	m.Lock()
	defer m.Unlock()

	rx, exists := h.store.GetRx(id)
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "处方不存在"})
		return
	}

	if rx.IsVoid {
		c.JSON(http.StatusBadRequest, gin.H{"error": "处方已作废"})
		return
	}

	staffID, _ := c.Get("staff_id")
	staffName := ""
	if staff, ok := h.store.GetStaff(staffID.(string)); ok {
		staffName = staff.Name
	}

	var req VoidRxRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请填写作废原因"})
		return
	}

	now := time.Now()
	rx.Status = model.RxStatusVoid
	rx.IsVoid = true
	rx.VoidReason = req.Reason
	rx.Actions = append(rx.Actions, model.RxActionLog{
		Action:       "处方作废",
		OperatorID:   staffID.(string),
		OperatorName: staffName,
		Timestamp:    now,
		Remark:       req.Reason,
	})
	rx.UpdatedAt = now

	h.store.UpdateRx(rx)

	c.JSON(http.StatusOK, rx)
}

type InitiateHandoverRequest struct {
	ToStaffID string `json:"to_staff_id" binding:"required"`
}

func (h *RxHandler) InitiateHandover(c *gin.Context) {
	id := c.Param("id")

	mu, _ := rxMutex.LoadOrStore(id, &sync.Mutex{})
	m := mu.(*sync.Mutex)
	m.Lock()
	defer m.Unlock()

	rx, exists := h.store.GetRx(id)
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "处方不存在"})
		return
	}

	if rx.IsVoid {
		c.JSON(http.StatusBadRequest, gin.H{"error": "处方已作废"})
		return
	}

	if rx.Status == model.RxStatusCompleted || rx.Status == model.RxStatusVoid {
		c.JSON(http.StatusBadRequest, gin.H{"error": "处方已完成或作废，不能交接"})
		return
	}

	staffID, _ := c.Get("staff_id")
	if rx.CurrentHolderID != staffID.(string) {
		c.JSON(http.StatusForbidden, gin.H{"error": "只有当前持方人才能发起交接"})
		return
	}

	if rx.HandoverPending {
		c.JSON(http.StatusBadRequest, gin.H{"error": "已有交接在进行中"})
		return
	}

	var req InitiateHandoverRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误"})
		return
	}

	targetStaff, exists := h.store.GetStaff(req.ToStaffID)
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "目标员工不存在"})
		return
	}

	staffName := ""
	if staff, ok := h.store.GetStaff(staffID.(string)); ok {
		staffName = staff.Name
	}

	now := time.Now()
	rx.HandoverPending = true
	rx.HandoverFromID = staffID.(string)
	rx.HandoverToID = req.ToStaffID
	rx.Actions = append(rx.Actions, model.RxActionLog{
		Action:       "发起交接",
		OperatorID:   staffID.(string),
		OperatorName: staffName,
		Timestamp:    now,
		Remark:       "交接给: " + targetStaff.Name,
	})
	rx.UpdatedAt = now

	h.store.UpdateRx(rx)

	c.JSON(http.StatusOK, rx)
}

func (h *RxHandler) AcceptHandover(c *gin.Context) {
	id := c.Param("id")

	mu, _ := rxMutex.LoadOrStore(id, &sync.Mutex{})
	m := mu.(*sync.Mutex)
	m.Lock()
	defer m.Unlock()

	rx, exists := h.store.GetRx(id)
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "处方不存在"})
		return
	}

	if !rx.HandoverPending {
		c.JSON(http.StatusBadRequest, gin.H{"error": "没有待接收的交接"})
		return
	}

	staffID, _ := c.Get("staff_id")
	if rx.HandoverToID != staffID.(string) {
		c.JSON(http.StatusForbidden, gin.H{"error": "您不是交接接收人"})
		return
	}

	staffName := ""
	if staff, ok := h.store.GetStaff(staffID.(string)); ok {
		staffName = staff.Name
	}

	now := time.Now()
	rx.HandoverPending = false
	rx.CurrentHolderID = staffID.(string)
	rx.CurrentHolderName = staffName
	rx.HandoverFromID = ""
	rx.HandoverToID = ""
	rx.Actions = append(rx.Actions, model.RxActionLog{
		Action:       "接收交接",
		OperatorID:   staffID.(string),
		OperatorName: staffName,
		Timestamp:    now,
	})
	rx.UpdatedAt = now

	h.store.UpdateRx(rx)

	c.JSON(http.StatusOK, rx)
}

func (h *RxHandler) ListPendingHandovers(c *gin.Context) {
	staffID, _ := c.Get("staff_id")
	allRx := h.store.ListRx("", "")

	pending := make([]*model.Rx, 0)
	for _, rx := range allRx {
		if rx.HandoverPending && rx.HandoverToID == staffID.(string) {
			pending = append(pending, rx)
		}
	}

	c.JSON(http.StatusOK, pending)
}
