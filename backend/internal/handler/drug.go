package handler

import (
	"net/http"
	"strconv"
	"time"

	"pharmacy/internal/model"
	"pharmacy/internal/store"

	"github.com/gin-gonic/gin"
)

type DrugHandler struct {
	store *store.MemoryStore
}

func NewDrugHandler(s *store.MemoryStore) *DrugHandler {
	return &DrugHandler{store: s}
}

func (h *DrugHandler) ListDrugs(c *gin.Context) {
	drugs := h.store.ListDrugs()

	role, _ := c.Get("staff_role")
	if role != "manager" {
		for _, d := range drugs {
			d.CostPrice = 0
		}
	}

	c.JSON(http.StatusOK, drugs)
}

func (h *DrugHandler) SearchDrugs(c *gin.Context) {
	keyword := c.Query("keyword")
	drugs := h.store.SearchDrugs(keyword)

	role, _ := c.Get("staff_role")
	if role != "manager" {
		for _, d := range drugs {
			d.CostPrice = 0
		}
	}

	c.JSON(http.StatusOK, drugs)
}

func (h *DrugHandler) GetDrug(c *gin.Context) {
	id := c.Param("id")
	drug, exists := h.store.GetDrug(id)
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "药品不存在"})
		return
	}

	role, _ := c.Get("staff_role")
	if role != "manager" {
		drug.CostPrice = 0
	}

	c.JSON(http.StatusOK, drug)
}

type CreateDrugRequest struct {
	ProductName    string            `json:"product_name" binding:"required"`
	GenericName    string            `json:"generic_name" binding:"required"`
	GenericNameEn  string            `json:"generic_name_en"`
	Specification  string            `json:"specification" binding:"required"`
	Manufacturer   string            `json:"manufacturer"`
	IsPrescription bool              `json:"is_prescription"`
	Category       model.DrugCategory `json:"category"`
	StockMin       int               `json:"stock_min"`
	StockMax       int               `json:"stock_max"`
	CostPrice      float64           `json:"cost_price"`
	SalePrice      float64           `json:"sale_price" binding:"required"`
	InsuranceType  string            `json:"insurance_type"`
}

func (h *DrugHandler) CreateDrug(c *gin.Context) {
	var req CreateDrugRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误"})
		return
	}

	now := time.Now()
	id := "drug-" + strconv.FormatInt(now.Unix(), 10)

	drug := &model.Drug{
		ID:             id,
		ProductName:    req.ProductName,
		GenericName:    req.GenericName,
		GenericNameEn:  req.GenericNameEn,
		Specification:  req.Specification,
		Manufacturer:   req.Manufacturer,
		IsPrescription: req.IsPrescription,
		Category:       req.Category,
		StockMin:       req.StockMin,
		StockMax:       req.StockMax,
		CostPrice:      req.CostPrice,
		SalePrice:      req.SalePrice,
		InsuranceType:  req.InsuranceType,
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	if drug.Category == "" {
		drug.Category = model.DrugCategoryNormal
	}

	h.store.AddDrug(drug)

	c.JSON(http.StatusCreated, drug)
}

type UpdateDrugRequest struct {
	ProductName    string            `json:"product_name"`
	GenericName    string            `json:"generic_name"`
	GenericNameEn  string            `json:"generic_name_en"`
	Specification  string            `json:"specification"`
	Manufacturer   string            `json:"manufacturer"`
	IsPrescription *bool             `json:"is_prescription"`
	Category       model.DrugCategory `json:"category"`
	StockMin       *int              `json:"stock_min"`
	StockMax       *int              `json:"stock_max"`
	CostPrice      *float64          `json:"cost_price"`
	SalePrice      *float64          `json:"sale_price"`
	InsuranceType  string            `json:"insurance_type"`
}

func (h *DrugHandler) UpdateDrug(c *gin.Context) {
	id := c.Param("id")
	drug, exists := h.store.GetDrug(id)
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "药品不存在"})
		return
	}

	var req UpdateDrugRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误"})
		return
	}

	if req.ProductName != "" {
		drug.ProductName = req.ProductName
	}
	if req.GenericName != "" {
		drug.GenericName = req.GenericName
	}
	if req.GenericNameEn != "" {
		drug.GenericNameEn = req.GenericNameEn
	}
	if req.Specification != "" {
		drug.Specification = req.Specification
	}
	if req.Manufacturer != "" {
		drug.Manufacturer = req.Manufacturer
	}
	if req.IsPrescription != nil {
		drug.IsPrescription = *req.IsPrescription
	}
	if req.Category != "" {
		drug.Category = req.Category
	}
	if req.StockMin != nil {
		drug.StockMin = *req.StockMin
	}
	if req.StockMax != nil {
		drug.StockMax = *req.StockMax
	}
	if req.CostPrice != nil {
		drug.CostPrice = *req.CostPrice
	}
	if req.SalePrice != nil {
		drug.SalePrice = *req.SalePrice
	}
	if req.InsuranceType != "" {
		drug.InsuranceType = req.InsuranceType
	}

	drug.UpdatedAt = time.Now()

	h.store.AddDrug(drug)

	c.JSON(http.StatusOK, drug)
}

type StockInRequest struct {
	BatchNo    string  `json:"batch_no" binding:"required"`
	ExpiryDate string  `json:"expiry_date" binding:"required"`
	Quantity   int     `json:"quantity" binding:"required,min=1"`
	Operator   string  `json:"operator"`
}

func (h *DrugHandler) StockIn(c *gin.Context) {
	drugID := c.Param("id")
	_, exists := h.store.GetDrug(drugID)
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "药品不存在"})
		return
	}

	var req StockInRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误"})
		return
	}

	expiryDate, err := time.Parse("2006-01-02", req.ExpiryDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "有效期格式错误，请使用 YYYY-MM-DD"})
		return
	}

	staffID, _ := c.Get("staff_id")
	operator := staffID.(string)

	now := time.Now()
	batchID := "batch-" + strconv.FormatInt(now.Unix(), 10)

	batch := &model.DrugBatch{
		ID:         batchID,
		DrugID:     drugID,
		BatchNo:    req.BatchNo,
		ExpiryDate: expiryDate,
		Stock:      req.Quantity,
		InDate:     now,
		InOperator: operator,
	}

	h.store.AddBatch(batch)

	drug, _ := h.store.GetDrug(drugID)
	ledgerRec := &model.GSPLedgerRecord{
		ID:            "ledger-" + strconv.FormatInt(now.Unix(), 10),
		Date:          now.Format("2006-01-02"),
		Type:          "入库",
		DrugID:        drugID,
		DrugName:      drug.ProductName,
		Specification: drug.Specification,
		BatchNo:       req.BatchNo,
		ExpiryDate:    req.ExpiryDate,
		Quantity:      req.Quantity,
		Balance:       drug.TotalStock,
		Operator:      operator,
		Remark:        "采购入库",
	}
	h.store.AddLedgerRecord(ledgerRec)

	c.JSON(http.StatusOK, batch)
}

func (h *DrugHandler) GetAlerts(c *gin.Context) {
	expiryDrugs := h.store.GetExpiryAlerts(30)
	stockLowDrugs := h.store.GetStockLowAlerts()

	role, _ := c.Get("staff_role")
	if role != "manager" {
		for _, d := range expiryDrugs {
			d.CostPrice = 0
		}
		for _, d := range stockLowDrugs {
			d.CostPrice = 0
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"red_alerts":    expiryDrugs,
		"orange_alerts": stockLowDrugs,
	})
}

func (h *DrugHandler) ListBatches(c *gin.Context) {
	drugID := c.Param("id")
	batches := h.store.GetBatches(drugID)
	c.JSON(http.StatusOK, batches)
}

type TemperatureRecordRequest struct {
	DrugID   string  `json:"drug_id" binding:"required"`
	BatchID  string  `json:"batch_id"`
	Temp     float64 `json:"temp" binding:"required"`
	SensorID string  `json:"sensor_id"`
}

func (h *DrugHandler) RecordTemperature(c *gin.Context) {
	var req TemperatureRecordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误"})
		return
	}

	_, exists := h.store.GetDrug(req.DrugID)
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "药品不存在"})
		return
	}

	now := time.Now()
	rec := &model.TemperatureRecord{
		ID:         "temp-" + strconv.FormatInt(now.Unix(), 10),
		DrugID:     req.DrugID,
		BatchID:    req.BatchID,
		Temp:       req.Temp,
		RecordTime: now,
		SensorID:   req.SensorID,
	}

	h.store.AddTemperatureRecord(rec)
	h.store.CheckColdChainDrugs()

	c.JSON(http.StatusOK, rec)
}

func (h *DrugHandler) GetTemperatureRecords(c *gin.Context) {
	drugID := c.Param("id")

	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	var startTime, endTime time.Time
	var err error

	if startDate != "" {
		startTime, err = time.Parse("2006-01-02", startDate)
		if err != nil {
			startTime = time.Now().AddDate(0, 0, -7)
		}
	} else {
		startTime = time.Now().AddDate(0, 0, -7)
	}

	if endDate != "" {
		endTime, err = time.Parse("2006-01-02", endDate)
		if err != nil {
			endTime = time.Now()
		}
	} else {
		endTime = time.Now()
	}

	records := h.store.GetTemperatureRecords(drugID, startTime, endTime)
	c.JSON(http.StatusOK, records)
}
