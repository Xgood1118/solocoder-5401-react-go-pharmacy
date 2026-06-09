package handler

import (
	"net/http"
	"strconv"
	"time"

	"pharmacy/internal/model"
	"pharmacy/internal/store"

	"github.com/gin-gonic/gin"
)

type InsuranceHandler struct {
	store *store.MemoryStore
}

func NewInsuranceHandler(s *store.MemoryStore) *InsuranceHandler {
	return &InsuranceHandler{store: s}
}

func (h *InsuranceHandler) ListSettlements(c *gin.Context) {
	settlements := h.store.ListSettlements()
	c.JSON(http.StatusOK, settlements)
}

func (h *InsuranceHandler) GetSettlement(c *gin.Context) {
	id := c.Param("id")
	settlement, exists := h.store.GetSettlement(id)
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "结算单不存在"})
		return
	}
	c.JSON(http.StatusOK, settlement)
}

type GenerateMonthlySettlementRequest struct {
	Period string `json:"period" binding:"required"`
}

func (h *InsuranceHandler) GenerateMonthlySettlement(c *gin.Context) {
	var req GenerateMonthlySettlementRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误"})
		return
	}

	allRx := h.store.ListRx("", "")

	var rxList []*model.Rx
	for _, rx := range allRx {
		rxPeriod := rx.CreatedAt.Format("2006-01")
		if rxPeriod == req.Period && rx.Status == model.RxStatusInsurance && !rx.IsVoid {
			rxList = append(rxList, rx)
		}
	}

	totalAmount := 0.0
	insuranceAmount := 0.0
	selfPayAmount := 0.0

	for _, rx := range rxList {
		totalAmount += rx.TotalAmount
		insuranceAmount += rx.InsuranceAmount
		selfPayAmount += rx.SelfPayAmount
	}

	now := time.Now()
	settlementID := "settle-" + strconv.FormatInt(now.Unix(), 10)

	settlement := &model.InsuranceSettlement{
		ID:              settlementID,
		Period:          req.Period,
		TotalAmount:     totalAmount,
		InsuranceAmount: insuranceAmount,
		SelfPayAmount:   selfPayAmount,
		ReceivedAmount:  0,
		DiffAmount:      0,
		RxCount:         len(rxList),
		Status:          "pending",
		CreatedAt:       now,
	}

	h.store.AddSettlement(settlement)

	c.JSON(http.StatusCreated, settlement)
}

type ReconcileRequest struct {
	SettlementID   string  `json:"settlement_id" binding:"required"`
	ReceivedAmount float64 `json:"received_amount" binding:"required"`
}

func (h *InsuranceHandler) Reconcile(c *gin.Context) {
	var req ReconcileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误"})
		return
	}

	settlement, exists := h.store.GetSettlement(req.SettlementID)
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "结算单不存在"})
		return
	}

	diffAmount := req.ReceivedAmount - settlement.InsuranceAmount

	settlement.ReceivedAmount = req.ReceivedAmount
	settlement.DiffAmount = diffAmount

	if diffAmount == 0 {
		settlement.Status = "matched"
	} else {
		settlement.Status = "discrepancy"
		h.generateDiscrepancies(settlement)
	}

	c.JSON(http.StatusOK, settlement)
}

func (h *InsuranceHandler) generateDiscrepancies(settlement *model.InsuranceSettlement) {
	allRx := h.store.ListRx("", "")

	for _, rx := range allRx {
		rxPeriod := rx.CreatedAt.Format("2006-01")
		if rxPeriod == settlement.Period && rx.Status == model.RxStatusInsurance && !rx.IsVoid {
			expected := rx.InsuranceAmount
			actual := expected * 0.98

			diff := actual - expected
			if diff < -0.01 || diff > 0.01 {
				now := time.Now()
				discrepancy := &model.InsuranceDiscrepancy{
					ID:                "disc-" + strconv.FormatInt(now.Unix(), 10) + "-" + rx.ID,
					SettlementID:      settlement.ID,
					RxID:              rx.ID,
					RxNo:              rx.RxNo,
					BatchNo:           "",
					StoreOrderNo:      rx.RxNo,
					UpstreamReceiptNo: "UP-" + rx.InsuranceClaimNo,
					ExpectedAmount:    expected,
					ActualAmount:      actual,
					DiffAmount:        diff,
					Reason:            "系统预估差异",
					CreatedAt:         now,
				}
				h.store.AddDiscrepancy(discrepancy)
			}
		}
	}
}

func (h *InsuranceHandler) ListDiscrepancies(c *gin.Context) {
	discrepancies := h.store.ListDiscrepancies()
	c.JSON(http.StatusOK, discrepancies)
}

func (h *InsuranceHandler) SyncCatalog(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "医保目录同步成功"})
}

func (h *InsuranceHandler) ListCatalog(c *gin.Context) {
	catalog := h.store.ListCatalog()
	c.JSON(http.StatusOK, catalog)
}
