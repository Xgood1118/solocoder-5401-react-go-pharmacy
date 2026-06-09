package handler

import (
	"compress/gzip"
	"encoding/csv"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"pharmacy/internal/model"
	"pharmacy/internal/store"

	"github.com/gin-gonic/gin"
)

type GSPHandler struct {
	store *store.MemoryStore
}

func NewGSPHandler(s *store.MemoryStore) *GSPHandler {
	return &GSPHandler{store: s}
}

func (h *GSPHandler) GetLedger(c *gin.Context) {
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	ledger := h.store.GetLedger(startDate, endDate)
	c.JSON(http.StatusOK, ledger)
}

type ExportLedgerRequest struct {
	Period string `json:"period" binding:"required"`
}

func (h *GSPHandler) ExportLedger(c *gin.Context) {
	var req ExportLedgerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误"})
		return
	}

	archivePath := "./disk/archive"
	if err := os.MkdirAll(archivePath, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建归档目录失败"})
		return
	}

	startDate := req.Period + "-01"
	endDate := req.Period + "-31"

	ledger := h.store.GetLedger(startDate, endDate)

	csvFileName := req.Period + ".csv"
	csvFilePath := filepath.Join("./disk", csvFileName)

	file, err := os.Create(csvFilePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建CSV文件失败"})
		return
	}
	defer file.Close()

	writer := csv.NewWriter(file)
	defer writer.Flush()

	header := []string{"日期", "类型", "药品ID", "药品名称", "规格", "批号", "效期", "数量", "结存", "操作员", "备注", "处方号"}
	if err := writer.Write(header); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "写入CSV失败"})
		return
	}

	for _, rec := range ledger {
		row := []string{
			rec.Date,
			rec.Type,
			rec.DrugID,
			rec.DrugName,
			rec.Specification,
			rec.BatchNo,
			rec.ExpiryDate,
			strconv.Itoa(rec.Quantity),
			strconv.Itoa(rec.Balance),
			rec.Operator,
			rec.Remark,
			rec.RxNo,
		}
		if err := writer.Write(row); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "写入CSV失败"})
			return
		}
	}

	gzFileName := req.Period + ".gz"
	gzFilePath := filepath.Join(archivePath, gzFileName)

	if err := gzipFile(csvFilePath, gzFilePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "压缩归档失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":      "台账导出成功",
		"csv_file":     csvFilePath,
		"archive_file": gzFilePath,
		"record_count": len(ledger),
	})
}

func gzipFile(src, dst string) error {
	srcFile, err := os.Open(src)
	if err != nil {
		return err
	}
	defer srcFile.Close()

	dstFile, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer dstFile.Close()

	gzWriter := gzip.NewWriter(dstFile)
	defer gzWriter.Close()

	_, err = io.Copy(gzWriter, srcFile)
	return err
}

func (h *GSPHandler) ListArchives(c *gin.Context) {
	archivePath := "./disk/archive"

	files, err := os.ReadDir(archivePath)
	if err != nil {
		if os.IsNotExist(err) {
			c.JSON(http.StatusOK, []string{})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "读取归档目录失败"})
		return
	}

	archives := make([]map[string]interface{}, 0)
	for _, f := range files {
		if !f.IsDir() {
			info, _ := f.Info()
			archives = append(archives, map[string]interface{}{
				"name":      f.Name(),
				"size":      info.Size(),
				"modified":  info.ModTime(),
				"file_path": filepath.Join(archivePath, f.Name()),
			})
		}
	}

	c.JSON(http.StatusOK, archives)
}

type TransferHandler struct {
	store *store.MemoryStore
}

func NewTransferHandler(s *store.MemoryStore) *TransferHandler {
	return &TransferHandler{store: s}
}

func (h *TransferHandler) ListTransfers(c *gin.Context) {
	status := c.Query("status")
	transfers := h.store.ListTransfers(status)
	c.JSON(http.StatusOK, transfers)
}

func (h *TransferHandler) GetTransfer(c *gin.Context) {
	id := c.Param("id")
	transfer, exists := h.store.GetTransfer(id)
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "调拨单不存在"})
		return
	}
	c.JSON(http.StatusOK, transfer)
}

type CreateTransferItem struct {
	DrugID   string `json:"drug_id" binding:"required"`
	BatchID  string `json:"batch_id"`
	Quantity int    `json:"quantity" binding:"required,min=1"`
}

type CreateTransferRequest struct {
	FromStoreID   string               `json:"from_store_id" binding:"required"`
	FromStoreName string               `json:"from_store_name"`
	ToStoreID     string               `json:"to_store_id" binding:"required"`
	ToStoreName   string               `json:"to_store_name"`
	Items         []CreateTransferItem `json:"items" binding:"required,min=1"`
}

func (h *TransferHandler) CreateTransfer(c *gin.Context) {
	var req CreateTransferRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误"})
		return
	}

	items := make([]model.TransferItem, 0, len(req.Items))
	for _, item := range req.Items {
		drug, exists := h.store.GetDrug(item.DrugID)
		if !exists {
			c.JSON(http.StatusBadRequest, gin.H{"error": "药品不存在: " + item.DrugID})
			return
		}
		batchNo := ""
		if item.BatchID != "" {
			batches := h.store.GetBatches(item.DrugID)
			for _, b := range batches {
				if b.ID == item.BatchID {
					batchNo = b.BatchNo
					break
				}
			}
		}

		items = append(items, model.TransferItem{
			DrugID:        drug.ID,
			DrugName:      drug.ProductName,
			Specification: drug.Specification,
			BatchID:       item.BatchID,
			BatchNo:       batchNo,
			Quantity:      item.Quantity,
		})
	}

	now := time.Now()
	transferID := "transfer-" + strconv.FormatInt(now.Unix(), 10)
	transferNo := "TR" + now.Format("20060102") + strconv.Itoa(int(now.Unix()%1000))

	transfer := &model.DrugTransfer{
		ID:            transferID,
		TransferNo:    transferNo,
		FromStoreID:   req.FromStoreID,
		FromStoreName: req.FromStoreName,
		ToStoreID:     req.ToStoreID,
		ToStoreName:   req.ToStoreName,
		Items:         items,
		Status:        model.TransferPending,
		CreatedAt:     now,
	}

	h.store.AddTransfer(transfer)

	c.JSON(http.StatusCreated, transfer)
}

func (h *TransferHandler) SignOut(c *gin.Context) {
	id := c.Param("id")

	transfer, exists := h.store.GetTransfer(id)
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "调拨单不存在"})
		return
	}

	if transfer.Status != model.TransferPending {
		c.JSON(http.StatusBadRequest, gin.H{"error": "调拨单状态不正确，当前状态: " + string(transfer.Status)})
		return
	}

	staffID, _ := c.Get("staff_id")
	staffName := ""
	if staff, ok := h.store.GetStaff(staffID.(string)); ok {
		staffName = staff.Name
	}

	now := time.Now()
	transfer.Status = model.TransferSignedOut
	transfer.SignOutOperatorID = staffID.(string)
	transfer.SignOutOperatorName = staffName
	transfer.SignOutTime = now

	h.store.UpdateTransfer(transfer)

	c.JSON(http.StatusOK, transfer)
}

func (h *TransferHandler) SignIn(c *gin.Context) {
	id := c.Param("id")

	transfer, exists := h.store.GetTransfer(id)
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "调拨单不存在"})
		return
	}

	if transfer.Status != model.TransferSignedOut {
		c.JSON(http.StatusBadRequest, gin.H{"error": "调拨单状态不正确，当前状态: " + string(transfer.Status)})
		return
	}

	staffID, _ := c.Get("staff_id")
	staffName := ""
	if staff, ok := h.store.GetStaff(staffID.(string)); ok {
		staffName = staff.Name
	}

	now := time.Now()
	transfer.Status = model.TransferSignedIn
	transfer.SignInOperatorID = staffID.(string)
	transfer.SignInOperatorName = staffName
	transfer.SignInTime = now

	h.store.UpdateTransfer(transfer)

	c.JSON(http.StatusOK, transfer)
}

func (h *TransferHandler) MonthlyReport(c *gin.Context) {
	period := c.Query("period")
	if period == "" {
		period = time.Now().Format("2006-01")
	}

	allTransfers := h.store.ListTransfers("")

	var reportItems []map[string]interface{}
	totalQuantity := 0

	for _, t := range allTransfers {
		transferPeriod := t.CreatedAt.Format("2006-01")
		if transferPeriod == period && t.Status == model.TransferSignedIn {
			for _, item := range t.Items {
				reportItems = append(reportItems, map[string]interface{}{
					"transfer_no":   t.TransferNo,
					"from_store":    t.FromStoreName,
					"to_store":      t.ToStoreName,
					"drug_name":     item.DrugName,
					"specification": item.Specification,
					"batch_no":      item.BatchNo,
					"quantity":      item.Quantity,
					"sign_out_time": t.SignOutTime,
					"sign_in_time":  t.SignInTime,
				})
				totalQuantity += item.Quantity
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"period":          period,
		"transfer_count":  len(reportItems),
		"total_quantity":  totalQuantity,
		"details":         reportItems,
	})
}
