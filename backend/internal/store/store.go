package store

import (
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"

	"pharmacy/internal/model"
)

type MemoryStore struct {
	mu sync.RWMutex

	Staffs map[string]*model.Staff

	Drugs    map[string]*model.Drug
	DrugBatches map[string][]*model.DrugBatch
	DrugIndex map[string]string

	Rxes map[string]*model.Rx

	InsuranceCatalog  map[string]*model.InsuranceCatalogItem
	Settlements       map[string]*model.InsuranceSettlement
	Discrepancies     map[string]*model.InsuranceDiscrepancy

	Shifts    map[string]*model.Shift
	SwapRequests map[string]*model.SwapRequest

	TemperatureRecords map[string][]*model.TemperatureRecord

	Transfers map[string]*model.DrugTransfer

	GSPLedger []*model.GSPLedgerRecord

	nextID int
}

func NewMemoryStore() *MemoryStore {
	return &MemoryStore{
		Staffs:             make(map[string]*model.Staff),
		Drugs:              make(map[string]*model.Drug),
		DrugBatches:        make(map[string][]*model.DrugBatch),
		DrugIndex:          make(map[string]string),
		Rxes:               make(map[string]*model.Rx),
		InsuranceCatalog:   make(map[string]*model.InsuranceCatalogItem),
		Settlements:        make(map[string]*model.InsuranceSettlement),
		Discrepancies:      make(map[string]*model.InsuranceDiscrepancy),
		Shifts:             make(map[string]*model.Shift),
		SwapRequests:       make(map[string]*model.SwapRequest),
		TemperatureRecords: make(map[string][]*model.TemperatureRecord),
		Transfers:          make(map[string]*model.DrugTransfer),
		GSPLedger:          make([]*model.GSPLedgerRecord, 0),
		nextID:             1,
	}
}

func (s *MemoryStore) generateID(prefix string) string {
	s.mu.Lock()
	defer s.mu.Unlock()
	id := s.nextID
	s.nextID++
	return fmt.Sprintf("%s-%s-%06d", prefix, time.Now().Format("20060102"), id)
}

func (s *MemoryStore) AddLedgerRecord(rec *model.GSPLedgerRecord) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.GSPLedger = append(s.GSPLedger, rec)
}

func (s *MemoryStore) GetStaff(id string) (*model.Staff, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	staff, ok := s.Staffs[id]
	if !ok {
		return nil, false
	}
	return staff, true
}

func (s *MemoryStore) GetStaffByUsername(username string) (*model.Staff, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, staff := range s.Staffs {
		if staff.Username == username {
			return staff, true
		}
	}
	return nil, false
}

func (s *MemoryStore) ListStaff() []*model.Staff {
	s.mu.RLock()
	defer s.mu.RUnlock()
	result := make([]*model.Staff, 0, len(s.Staffs))
	for _, s := range s.Staffs {
		result = append(result, s)
	}
	sort.Slice(result, func(i, j int) bool {
		return result[i].CreatedAt.Before(result[j].CreatedAt)
	})
	return result
}

func (s *MemoryStore) AddStaff(staff *model.Staff) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.Staffs[staff.ID] = staff
}

func (s *MemoryStore) UpdateStaff(staff *model.Staff) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.Staffs[staff.ID] = staff
}

func (s *MemoryStore) AddDrug(drug *model.Drug) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.Drugs[drug.ID] = drug
	s.DrugIndex[strings.ToLower(drug.ProductName)] = drug.ID
	s.DrugIndex[strings.ToLower(drug.GenericName)] = drug.ID
	s.DrugIndex[strings.ToLower(drug.GenericNameEn)] = drug.ID
}

func (s *MemoryStore) GetDrug(id string) (*model.Drug, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	drug, ok := s.Drugs[id]
	return drug, ok
}

func (s *MemoryStore) ListDrugs() []*model.Drug {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.listDrugsLocked()
}

func (s *MemoryStore) SearchDrugs(keyword string) []*model.Drug {
	s.mu.RLock()
	defer s.mu.RUnlock()
	keyword = strings.ToLower(strings.TrimSpace(keyword))
	if keyword == "" {
		return s.listDrugsLocked()
	}

	found := make(map[string]bool)
	result := make([]*model.Drug, 0)

	for key, drugID := range s.DrugIndex {
		if strings.Contains(key, keyword) {
			found[drugID] = true
		}
	}

	for id := range found {
		if drug, ok := s.Drugs[id]; ok {
			drug.TotalStock = s.calcTotalStock(drug.ID)
			result = append(result, drug)
		}
	}

	if len(result) == 0 {
		for _, drug := range s.Drugs {
			if strings.Contains(strings.ToLower(drug.ProductName), keyword) ||
				strings.Contains(strings.ToLower(drug.GenericName), keyword) ||
				strings.Contains(strings.ToLower(drug.GenericNameEn), keyword) {
				drug.TotalStock = s.calcTotalStock(drug.ID)
				result = append(result, drug)
			}
		}
	}

	sort.Slice(result, func(i, j int) bool {
		return result[i].ProductName < result[j].ProductName
	})
	return result
}

func (s *MemoryStore) listDrugsLocked() []*model.Drug {
	result := make([]*model.Drug, 0, len(s.Drugs))
	for _, d := range s.Drugs {
		d.TotalStock = s.calcTotalStock(d.ID)
		result = append(result, d)
	}
	sort.Slice(result, func(i, j int) bool {
		return result[i].ProductName < result[j].ProductName
	})
	return result
}

func (s *MemoryStore) calcTotalStock(drugID string) int {
	batches := s.DrugBatches[drugID]
	total := 0
	for _, b := range batches {
		if !b.Locked {
			total += b.Stock
		}
	}
	return total
}

func (s *MemoryStore) GetBatches(drugID string) []*model.DrugBatch {
	s.mu.RLock()
	defer s.mu.RUnlock()
	batches, ok := s.DrugBatches[drugID]
	if !ok {
		return []*model.DrugBatch{}
	}
	result := make([]*model.DrugBatch, len(batches))
	copy(result, batches)
	sort.Slice(result, func(i, j int) bool {
		if result[i].InDate.Equal(result[j].InDate) {
			return result[i].BatchNo < result[j].BatchNo
		}
		return result[i].InDate.Before(result[j].InDate)
	})
	return result
}

func (s *MemoryStore) AddBatch(batch *model.DrugBatch) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.DrugBatches[batch.DrugID] = append(s.DrugBatches[batch.DrugID], batch)
	sort.Slice(s.DrugBatches[batch.DrugID], func(i, j int) bool {
		if s.DrugBatches[batch.DrugID][i].InDate.Equal(s.DrugBatches[batch.DrugID][j].InDate) {
			return s.DrugBatches[batch.DrugID][i].BatchNo < s.DrugBatches[batch.DrugID][j].BatchNo
		}
		return s.DrugBatches[batch.DrugID][i].InDate.Before(s.DrugBatches[batch.DrugID][j].InDate)
	})

	if drug, ok := s.Drugs[batch.DrugID]; ok {
		drug.TotalStock = s.calcTotalStock(batch.DrugID)
	}
}

func (s *MemoryStore) DeductStockFIFO(drugID string, quantity int) ([]string, int, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	batches, ok := s.DrugBatches[drugID]
	if !ok || len(batches) == 0 {
		return nil, 0, nil
	}

	batchIDs := make([]string, 0)
	remaining := quantity

	availableBatches := make([]*model.DrugBatch, 0)
	for _, b := range batches {
		if !b.Locked && b.Stock > 0 {
			availableBatches = append(availableBatches, b)
		}
	}

	sort.Slice(availableBatches, func(i, j int) bool {
		if availableBatches[i].InDate.Equal(availableBatches[j].InDate) {
			return availableBatches[i].BatchNo < availableBatches[j].BatchNo
		}
		return availableBatches[i].InDate.Before(availableBatches[j].InDate)
	})

	deducted := 0
	for _, batch := range availableBatches {
		if remaining <= 0 {
			break
		}
		if batch.Stock >= remaining {
			batch.Stock -= remaining
			batchIDs = append(batchIDs, batch.ID)
			deducted += remaining
			remaining = 0
		} else {
			remaining -= batch.Stock
			batchIDs = append(batchIDs, batch.ID)
			deducted += batch.Stock
			batch.Stock = 0
		}
	}

	if drug, ok := s.Drugs[drugID]; ok {
		drug.TotalStock = s.calcTotalStock(drugID)
	}

	return batchIDs, deducted, nil
}

func (s *MemoryStore) GetExpiryAlerts(days int) []*model.Drug {
	s.mu.RLock()
	defer s.mu.RUnlock()

	result := make([]*model.Drug, 0)
	now := time.Now()
	deadline := now.AddDate(0, 0, days)

	for drugID, batches := range s.DrugBatches {
		hasAlert := false
		for _, batch := range batches {
			if batch.Stock > 0 && batch.ExpiryDate.Before(deadline) && !batch.Locked {
				hasAlert = true
				break
			}
		}
		if hasAlert {
			if drug, ok := s.Drugs[drugID]; ok {
				drug.TotalStock = s.calcTotalStock(drugID)
				result = append(result, drug)
			}
		}
	}
	return result
}

func (s *MemoryStore) GetStockLowAlerts() []*model.Drug {
	s.mu.RLock()
	defer s.mu.RUnlock()

	seenGenerics := make(map[string]bool)
	result := make([]*model.Drug, 0)

	for _, drug := range s.Drugs {
		totalStock := s.calcTotalStock(drug.ID)
		if totalStock < drug.StockMin {
			genericKey := drug.GenericName
			if !seenGenerics[genericKey] {
				seenGenerics[genericKey] = true
				drug.TotalStock = totalStock
				result = append(result, drug)
			}
		}
	}
	return result
}

func (s *MemoryStore) UpdateBatchLock(drugID, batchID string, locked bool, reason string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	batches := s.DrugBatches[drugID]
	for _, b := range batches {
		if b.ID == batchID {
			b.Locked = locked
			b.LockedReason = reason
			break
		}
	}
	if drug, ok := s.Drugs[drugID]; ok {
		drug.TotalStock = s.calcTotalStock(drugID)
	}
}

func (s *MemoryStore) AddRx(rx *model.Rx) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.Rxes[rx.ID] = rx
}

func (s *MemoryStore) GetRx(id string) (*model.Rx, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	rx, ok := s.Rxes[id]
	return rx, ok
}

func (s *MemoryStore) ListRx(status string, operatorID string) []*model.Rx {
	s.mu.RLock()
	defer s.mu.RUnlock()
	result := make([]*model.Rx, 0)
	for _, rx := range s.Rxes {
		if status != "" && string(rx.Status) != status {
			continue
		}
		if operatorID != "" && rx.CurrentHolderID != operatorID && rx.OperatorID != operatorID {
			continue
		}
		result = append(result, rx)
	}
	sort.Slice(result, func(i, j int) bool {
		return result[i].CreatedAt.After(result[j].CreatedAt)
	})
	return result
}

func (s *MemoryStore) UpdateRx(rx *model.Rx) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.Rxes[rx.ID] = rx
}

func (s *MemoryStore) AddSettlement(settlement *model.InsuranceSettlement) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.Settlements[settlement.ID] = settlement
}

func (s *MemoryStore) UpdateSettlement(settlement *model.InsuranceSettlement) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.Settlements[settlement.ID] = settlement
}

func (s *MemoryStore) GetSettlement(id string) (*model.InsuranceSettlement, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	s2, ok := s.Settlements[id]
	return s2, ok
}

func (s *MemoryStore) ListSettlements() []*model.InsuranceSettlement {
	s.mu.RLock()
	defer s.mu.RUnlock()
	result := make([]*model.InsuranceSettlement, 0, len(s.Settlements))
	for _, s2 := range s.Settlements {
		result = append(result, s2)
	}
	sort.Slice(result, func(i, j int) bool {
		return result[i].CreatedAt.After(result[j].CreatedAt)
	})
	return result
}

func (s *MemoryStore) AddDiscrepancy(discrepancy *model.InsuranceDiscrepancy) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.Discrepancies[discrepancy.ID] = discrepancy
}

func (s *MemoryStore) ListDiscrepancies() []*model.InsuranceDiscrepancy {
	s.mu.RLock()
	defer s.mu.RUnlock()
	result := make([]*model.InsuranceDiscrepancy, 0, len(s.Discrepancies))
	for _, d := range s.Discrepancies {
		result = append(result, d)
	}
	sort.Slice(result, func(i, j int) bool {
		return result[i].CreatedAt.After(result[j].CreatedAt)
	})
	return result
}

func (s *MemoryStore) AddCatalogItem(item *model.InsuranceCatalogItem) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.InsuranceCatalog[item.ID] = item
}

func (s *MemoryStore) GetCatalogByDrugID(drugID string) (*model.InsuranceCatalogItem, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, item := range s.InsuranceCatalog {
		if item.DrugID == drugID {
			return item, true
		}
	}
	return nil, false
}

func (s *MemoryStore) ListCatalog() []*model.InsuranceCatalogItem {
	s.mu.RLock()
	defer s.mu.RUnlock()
	result := make([]*model.InsuranceCatalogItem, 0, len(s.InsuranceCatalog))
	for _, item := range s.InsuranceCatalog {
		result = append(result, item)
	}
	return result
}

func (s *MemoryStore) AddShift(shift *model.Shift) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.Shifts[shift.ID] = shift
}

func (s *MemoryStore) GetShift(id string) (*model.Shift, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	shift, ok := s.Shifts[id]
	return shift, ok
}

func (s *MemoryStore) ListShifts(date string) []*model.Shift {
	s.mu.RLock()
	defer s.mu.RUnlock()
	result := make([]*model.Shift, 0)
	for _, shift := range s.Shifts {
		if date != "" && shift.Date != date {
			continue
		}
		result = append(result, shift)
	}
	sort.Slice(result, func(i, j int) bool {
		if result[i].Date == result[j].Date {
			return result[i].ShiftType < result[j].ShiftType
		}
		return result[i].Date < result[j].Date
	})
	return result
}

func (s *MemoryStore) UpdateShift(shift *model.Shift) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.Shifts[shift.ID] = shift
}

func (s *MemoryStore) DeleteShift(id string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.Shifts, id)
}

func (s *MemoryStore) AddSwapRequest(req *model.SwapRequest) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.SwapRequests[req.ID] = req
}

func (s *MemoryStore) GetSwapRequest(id string) (*model.SwapRequest, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	req, ok := s.SwapRequests[id]
	return req, ok
}

func (s *MemoryStore) ListSwapRequests(status string, staffID string) []*model.SwapRequest {
	s.mu.RLock()
	defer s.mu.RUnlock()
	result := make([]*model.SwapRequest, 0)
	for _, req := range s.SwapRequests {
		if status != "" && string(req.Status) != status {
			continue
		}
		if staffID != "" && req.RequesterID != staffID && req.TargetStaffID != staffID {
			continue
		}
		result = append(result, req)
	}
	sort.Slice(result, func(i, j int) bool {
		return result[i].CreatedAt.After(result[j].CreatedAt)
	})
	return result
}

func (s *MemoryStore) UpdateSwapRequest(req *model.SwapRequest) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.SwapRequests[req.ID] = req
}

func (s *MemoryStore) CheckExpiredSwaps() {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now()
	for _, req := range s.SwapRequests {
		if (req.Status == model.SwapPending || req.Status == model.SwapConfirmed) && now.After(req.ExpiresAt) {
			req.Status = model.SwapExpired
		}
	}
}

func (s *MemoryStore) AddTemperatureRecord(rec *model.TemperatureRecord) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.TemperatureRecords[rec.DrugID] = append(s.TemperatureRecords[rec.DrugID], rec)
}

func (s *MemoryStore) GetTemperatureRecords(drugID string, startTime, endTime time.Time) []*model.TemperatureRecord {
	s.mu.RLock()
	defer s.mu.RUnlock()
	records, ok := s.TemperatureRecords[drugID]
	if !ok {
		return []*model.TemperatureRecord{}
	}
	result := make([]*model.TemperatureRecord, 0)
	for _, r := range records {
		if r.RecordTime.After(startTime) && r.RecordTime.Before(endTime) {
			result = append(result, r)
		}
	}
	sort.Slice(result, func(i, j int) bool {
		return result[i].RecordTime.Before(result[j].RecordTime)
	})
	return result
}

func (s *MemoryStore) CheckColdChainDrugs() {
	s.mu.Lock()
	defer s.mu.Unlock()
	for drugID, drug := range s.Drugs {
		if drug.Category != model.DrugCategoryColdChain {
			continue
		}
		records := s.TemperatureRecords[drugID]
		if len(records) == 0 {
			continue
		}
		lastTemp := records[len(records)-1].Temp
		batches := s.DrugBatches[drugID]
		for _, batch := range batches {
			if lastTemp < 2.0 || lastTemp > 8.0 {
				if !batch.Locked {
					batch.Locked = true
					batch.LockedReason = "冷链温度异常: " + formatTemp(lastTemp) + "°C"
				}
			} else {
				if batch.Locked && batch.LockedReason != "" && strings.HasPrefix(batch.LockedReason, "冷链温度异常") {
					batch.Locked = false
					batch.LockedReason = ""
				}
			}
		}
		drug.TotalStock = s.calcTotalStock(drugID)
	}
}

func formatTemp(t float64) string {
	return fmt.Sprintf("%.1f", t)
}

func (s *MemoryStore) AddTransfer(transfer *model.DrugTransfer) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.Transfers[transfer.ID] = transfer
}

func (s *MemoryStore) GetTransfer(id string) (*model.DrugTransfer, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	t, ok := s.Transfers[id]
	return t, ok
}

func (s *MemoryStore) ListTransfers(status string) []*model.DrugTransfer {
	s.mu.RLock()
	defer s.mu.RUnlock()
	result := make([]*model.DrugTransfer, 0)
	for _, t := range s.Transfers {
		if status != "" && string(t.Status) != status {
			continue
		}
		result = append(result, t)
	}
	sort.Slice(result, func(i, j int) bool {
		return result[i].CreatedAt.After(result[j].CreatedAt)
	})
	return result
}

func (s *MemoryStore) UpdateTransfer(transfer *model.DrugTransfer) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.Transfers[transfer.ID] = transfer
}

func (s *MemoryStore) GetLedger(startDate, endDate string) []*model.GSPLedgerRecord {
	s.mu.RLock()
	defer s.mu.RUnlock()
	result := make([]*model.GSPLedgerRecord, 0)
	for _, rec := range s.GSPLedger {
		if startDate != "" && rec.Date < startDate {
			continue
		}
		if endDate != "" && rec.Date > endDate {
			continue
		}
		result = append(result, rec)
	}
	sort.Slice(result, func(i, j int) bool {
		return result[i].Date < result[j].Date
	})
	return result
}
