package handler

import (
	"net/http"
	"time"

	"pharmacy/internal/middleware"
	"pharmacy/internal/model"
	"pharmacy/internal/store"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

type StaffHandler struct {
	store *store.MemoryStore
}

func NewStaffHandler(s *store.MemoryStore) *StaffHandler {
	return &StaffHandler{store: s}
}

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type LoginResponse struct {
	Token string      `json:"token"`
	Staff *model.Staff `json:"staff"`
}

func (h *StaffHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误"})
		return
	}

	staff, exists := h.store.GetStaffByUsername(req.Username)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "用户名或密码错误"})
		return
	}

	if staff.Locked {
		c.JSON(http.StatusForbidden, gin.H{"error": "账号已锁定，请联系管理员重置"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(staff.PasswordHash), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "用户名或密码错误"})
		return
	}

	token, err := middleware.GenerateToken(staff.ID, string(staff.Role))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "生成令牌失败"})
		return
	}

	passwordExpiresIn := int(time.Until(staff.PasswordExpiresAt).Hours() / 24)
	passwordWarning := passwordExpiresIn <= 7

	c.JSON(http.StatusOK, LoginResponse{
		Token: token,
		Staff: staff,
	})
	_ = passwordWarning
}

func (h *StaffHandler) GetProfile(c *gin.Context) {
	staffID, _ := c.Get("staff_id")
	staff, exists := h.store.GetStaff(staffID.(string))
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "用户不存在"})
		return
	}

	passwordExpiresIn := int(time.Until(staff.PasswordExpiresAt).Hours() / 24)
	passwordWarning := passwordExpiresIn <= 7

	c.JSON(http.StatusOK, gin.H{
		"staff":               staff,
		"password_expires_in": passwordExpiresIn,
		"password_warning":    passwordWarning,
	})
}

type ChangePasswordRequest struct {
	OldPassword string `json:"old_password" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=6"`
}

func (h *StaffHandler) ChangePassword(c *gin.Context) {
	staffID, _ := c.Get("staff_id")
	staff, exists := h.store.GetStaff(staffID.(string))
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "用户不存在"})
		return
	}

	var req ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(staff.PasswordHash), []byte(req.OldPassword)); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "原密码错误"})
		return
	}

	newHash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "密码加密失败"})
		return
	}

	staff.PasswordHash = string(newHash)
	staff.LastPasswordChange = time.Now()
	staff.PasswordExpiresAt = time.Now().AddDate(0, 1, 0)
	staff.Locked = false

	h.store.UpdateStaff(staff)

	c.JSON(http.StatusOK, gin.H{"message": "密码修改成功"})
}

func (h *StaffHandler) ListStaff(c *gin.Context) {
	staffs := h.store.ListStaff()
	c.JSON(http.StatusOK, staffs)
}

type CreateStaffRequest struct {
	Username string          `json:"username" binding:"required"`
	Name     string          `json:"name" binding:"required"`
	Password string          `json:"password" binding:"required,min=6"`
	Role     model.StaffRole `json:"role" binding:"required"`
	Phone    string          `json:"phone"`
}

func (h *StaffHandler) CreateStaff(c *gin.Context) {
	var req CreateStaffRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误"})
		return
	}

	if _, exists := h.store.GetStaffByUsername(req.Username); exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "用户名已存在"})
		return
	}

	pwdHash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "密码加密失败"})
		return
	}

	now := time.Now()
	staff := &model.Staff{
		ID:                 "staff-" + req.Username,
		Username:           req.Username,
		Name:               req.Name,
		PasswordHash:       string(pwdHash),
		Role:               req.Role,
		Phone:              req.Phone,
		Locked:             false,
		LastPasswordChange: now,
		PasswordExpiresAt:  now.AddDate(0, 1, 0),
		CreatedAt:          now,
	}

	h.store.AddStaff(staff)

	c.JSON(http.StatusCreated, staff)
}

type UpdateStaffRequest struct {
	Name  string          `json:"name"`
	Role  model.StaffRole `json:"role"`
	Phone string          `json:"phone"`
}

func (h *StaffHandler) UpdateStaff(c *gin.Context) {
	id := c.Param("id")
	staff, exists := h.store.GetStaff(id)
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "员工不存在"})
		return
	}

	var req UpdateStaffRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误"})
		return
	}

	if req.Name != "" {
		staff.Name = req.Name
	}
	if req.Role != "" {
		staff.Role = req.Role
	}
	if req.Phone != "" {
		staff.Phone = req.Phone
	}

	h.store.UpdateStaff(staff)

	c.JSON(http.StatusOK, staff)
}

func (h *StaffHandler) ResetPassword(c *gin.Context) {
	id := c.Param("id")
	staff, exists := h.store.GetStaff(id)
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "员工不存在"})
		return
	}

	defaultPwd := "123456"
	pwdHash, err := bcrypt.GenerateFromPassword([]byte(defaultPwd), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "密码加密失败"})
		return
	}

	staff.PasswordHash = string(pwdHash)
	staff.LastPasswordChange = time.Now()
	staff.PasswordExpiresAt = time.Now().AddDate(0, 1, 0)
	staff.Locked = false

	h.store.UpdateStaff(staff)

	c.JSON(http.StatusOK, gin.H{"message": "密码已重置为默认密码: 123456"})
}

func (h *StaffHandler) LockStaff(c *gin.Context) {
	id := c.Param("id")
	staff, exists := h.store.GetStaff(id)
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "员工不存在"})
		return
	}

	staff.Locked = true
	h.store.UpdateStaff(staff)

	c.JSON(http.StatusOK, gin.H{"message": "账号已锁定"})
}

func (h *StaffHandler) UnlockStaff(c *gin.Context) {
	id := c.Param("id")
	staff, exists := h.store.GetStaff(id)
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "员工不存在"})
		return
	}

	staff.Locked = false
	h.store.UpdateStaff(staff)

	c.JSON(http.StatusOK, gin.H{"message": "账号已解锁"})
}
