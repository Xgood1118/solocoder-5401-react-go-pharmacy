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

var swapMutex sync.Mutex

type ScheduleHandler struct {
	store *store.MemoryStore
}

func NewScheduleHandler(s *store.MemoryStore) *ScheduleHandler {
	return &ScheduleHandler{store: s}
}

func (h *ScheduleHandler) ListSchedule(c *gin.Context) {
	date := c.Query("date")
	shifts := h.store.ListShifts(date)
	c.JSON(http.StatusOK, shifts)
}

type CreateShiftRequest struct {
	Date      string            `json:"date" binding:"required"`
	ShiftType model.ShiftType   `json:"shift_type" binding:"required"`
	StaffID   string            `json:"staff_id" binding:"required"`
}

func (h *ScheduleHandler) CreateShift(c *gin.Context) {
	var req CreateShiftRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误"})
		return
	}

	staff, exists := h.store.GetStaff(req.StaffID)
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "员工不存在"})
		return
	}

	now := time.Now()
	shiftID := "shift-" + strconv.FormatInt(now.Unix(), 10)

	shift := &model.Shift{
		ID:        shiftID,
		Date:      req.Date,
		ShiftType: req.ShiftType,
		StaffID:   req.StaffID,
		StaffName: staff.Name,
		CreatedAt: now,
	}

	h.store.AddShift(shift)

	c.JSON(http.StatusCreated, shift)
}

type UpdateShiftRequest struct {
	Date      string          `json:"date"`
	ShiftType model.ShiftType `json:"shift_type"`
	StaffID   string          `json:"staff_id"`
}

func (h *ScheduleHandler) UpdateShift(c *gin.Context) {
	id := c.Param("id")
	shift, exists := h.store.GetShift(id)
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "排班不存在"})
		return
	}

	var req UpdateShiftRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误"})
		return
	}

	if req.Date != "" {
		shift.Date = req.Date
	}
	if req.ShiftType != "" {
		shift.ShiftType = req.ShiftType
	}
	if req.StaffID != "" {
		staff, ok := h.store.GetStaff(req.StaffID)
		if !ok {
			c.JSON(http.StatusNotFound, gin.H{"error": "员工不存在"})
			return
		}
		shift.StaffID = req.StaffID
		shift.StaffName = staff.Name
	}

	h.store.UpdateShift(shift)

	c.JSON(http.StatusOK, shift)
}

func (h *ScheduleHandler) DeleteShift(c *gin.Context) {
	id := c.Param("id")
	_, exists := h.store.GetShift(id)
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "排班不存在"})
		return
	}

	h.store.DeleteShift(id)

	c.JSON(http.StatusOK, gin.H{"message": "排班已删除"})
}

func (h *ScheduleHandler) ListSwaps(c *gin.Context) {
	status := c.Query("status")
	staffID, _ := c.Get("staff_id")
	myOnly := c.Query("my_only")

	h.store.CheckExpiredSwaps()

	if myOnly == "true" {
		swaps := h.store.ListSwapRequests(status, staffID.(string))
		c.JSON(http.StatusOK, swaps)
	} else {
		swaps := h.store.ListSwapRequests(status, "")
		c.JSON(http.StatusOK, swaps)
	}
}

type RequestSwapRequest struct {
	ShiftID       string `json:"shift_id" binding:"required"`
	TargetStaffID string `json:"target_staff_id" binding:"required"`
	Reason        string `json:"reason"`
}

func (h *ScheduleHandler) RequestSwap(c *gin.Context) {
	swapMutex.Lock()
	defer swapMutex.Unlock()

	var req RequestSwapRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误"})
		return
	}

	shift, exists := h.store.GetShift(req.ShiftID)
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "排班不存在"})
		return
	}

	staffID, _ := c.Get("staff_id")
	if shift.StaffID != staffID.(string) {
		c.JSON(http.StatusForbidden, gin.H{"error": "只能申请自己的班次换班"})
		return
	}

	targetStaff, exists := h.store.GetStaff(req.TargetStaffID)
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "目标员工不存在"})
		return
	}

	requester, _ := h.store.GetStaff(staffID.(string))

	now := time.Now()
	swapID := "swap-" + strconv.FormatInt(now.Unix(), 10)

	swap := &model.SwapRequest{
		ID:              swapID,
		ShiftID:         req.ShiftID,
		ShiftDate:       shift.Date,
		ShiftType:       shift.ShiftType,
		RequesterID:     staffID.(string),
		RequesterName:   requester.Name,
		TargetStaffID:   req.TargetStaffID,
		TargetStaffName: targetStaff.Name,
		Status:          model.SwapPending,
		Reason:          req.Reason,
		CreatedAt:       now,
		ExpiresAt:       now.Add(24 * time.Hour),
	}

	h.store.AddSwapRequest(swap)

	c.JSON(http.StatusCreated, swap)
}

func (h *ScheduleHandler) ConfirmSwap(c *gin.Context) {
	swapMutex.Lock()
	defer swapMutex.Unlock()

	id := c.Param("id")

	swap, exists := h.store.GetSwapRequest(id)
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "换班申请不存在"})
		return
	}

	h.store.CheckExpiredSwaps()
	swap, _ = h.store.GetSwapRequest(id)

	if swap.Status == model.SwapExpired {
		c.JSON(http.StatusBadRequest, gin.H{"error": "换班申请已过期"})
		return
	}

	if swap.Status != model.SwapPending {
		c.JSON(http.StatusBadRequest, gin.H{"error": "换班申请状态不正确，当前状态: " + string(swap.Status)})
		return
	}

	staffID, _ := c.Get("staff_id")
	if swap.TargetStaffID != staffID.(string) {
		c.JSON(http.StatusForbidden, gin.H{"error": "只有被换的同事才能确认换班"})
		return
	}

	now := time.Now()
	swap.Status = model.SwapConfirmed
	swap.ExpiresAt = now.Add(24 * time.Hour)

	h.store.UpdateSwapRequest(swap)

	c.JSON(http.StatusOK, swap)
}

type ApproveSwapRequest struct {
	Approve bool   `json:"approve"`
	Reason  string `json:"reason"`
}

func (h *ScheduleHandler) ApproveSwap(c *gin.Context) {
	swapMutex.Lock()
	defer swapMutex.Unlock()

	id := c.Param("id")

	swap, exists := h.store.GetSwapRequest(id)
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "换班申请不存在"})
		return
	}

	h.store.CheckExpiredSwaps()
	swap, _ = h.store.GetSwapRequest(id)

	if swap.Status == model.SwapExpired {
		c.JSON(http.StatusBadRequest, gin.H{"error": "换班申请已过期，无法审批"})
		return
	}

	if swap.Status != model.SwapConfirmed {
		c.JSON(http.StatusBadRequest, gin.H{"error": "换班申请状态不正确，当前状态: " + string(swap.Status)})
		return
	}

	shift, exists := h.store.GetShift(swap.ShiftID)
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "排班不存在"})
		return
	}

	origStaff := shift.StaffID
	origStaffName := shift.StaffName

	shift.StaffID = swap.TargetStaffID
	shift.StaffName = swap.TargetStaffName
	h.store.UpdateShift(shift)

	now := time.Now()
	swap.Status = model.SwapApproved
	swap.RejectReason = ""

	h.store.UpdateSwapRequest(swap)

	_ = origStaff
	_ = origStaffName

	c.JSON(http.StatusOK, swap)
}

type RejectSwapRequest struct {
	Reason string `json:"reason" binding:"required"`
}

func (h *ScheduleHandler) RejectSwap(c *gin.Context) {
	swapMutex.Lock()
	defer swapMutex.Unlock()

	id := c.Param("id")

	swap, exists := h.store.GetSwapRequest(id)
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "换班申请不存在"})
		return
	}

	h.store.CheckExpiredSwaps()
	swap, _ = h.store.GetSwapRequest(id)

	if swap.Status == model.SwapExpired {
		c.JSON(http.StatusBadRequest, gin.H{"error": "换班申请已过期"})
		return
	}

	if swap.Status != model.SwapConfirmed {
		c.JSON(http.StatusBadRequest, gin.H{"error": "换班申请状态不正确，当前状态: " + string(swap.Status)})
		return
	}

	var req RejectSwapRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请填写拒绝原因"})
		return
	}

	now := time.Now()
	swap.Status = model.SwapRejected
	swap.RejectReason = req.Reason

	h.store.UpdateSwapRequest(swap)

	c.JSON(http.StatusOK, swap)
}

func (h *ScheduleHandler) ListSwapHistory(c *gin.Context) {
	h.store.CheckExpiredSwaps()

	staffID, _ := c.Get("staff_id")
	swaps := h.store.ListSwapRequests("", staffID.(string))

	history := make([]*model.SwapRequest, 0)
	for _, s := range swaps {
		if s.Status == model.SwapApproved || s.Status == model.SwapRejected ||
			s.Status == model.SwapExpired || s.Status == model.SwapCancelled {
			history = append(history, s)
		}
	}

	c.JSON(http.StatusOK, history)
}
