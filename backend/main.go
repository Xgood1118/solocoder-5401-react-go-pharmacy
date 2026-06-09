package main

import (
	"log"
	"os"

	"pharmacy/internal/config"
	"pharmacy/internal/handler"
	"pharmacy/internal/middleware"
	"pharmacy/internal/store"

	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.Load()

	memStore := store.NewMemoryStore()
	store.InitSeedData(memStore)

	r := gin.Default()

	r.Use(middleware.CORS())

	api := r.Group("/api")
	{
		staffH := handler.NewStaffHandler(memStore)
		api.POST("/auth/login", staffH.Login)
		api.POST("/auth/change-password", middleware.Auth(memStore), staffH.ChangePassword)
		api.GET("/staff/profile", middleware.Auth(memStore), staffH.GetProfile)
		api.GET("/staff", middleware.Auth(memStore), middleware.RequireRole("manager"), staffH.ListStaff)
		api.POST("/staff", middleware.Auth(memStore), middleware.RequireRole("manager"), staffH.CreateStaff)
		api.PUT("/staff/:id", middleware.Auth(memStore), middleware.RequireRole("manager"), staffH.UpdateStaff)
		api.POST("/staff/:id/reset-password", middleware.Auth(memStore), middleware.RequireRole("manager"), staffH.ResetPassword)
		api.POST("/staff/:id/lock", middleware.Auth(memStore), middleware.RequireRole("manager"), staffH.LockStaff)
		api.POST("/staff/:id/unlock", middleware.Auth(memStore), middleware.RequireRole("manager"), staffH.UnlockStaff)

		drugH := handler.NewDrugHandler(memStore)
		api.GET("/drugs", middleware.Auth(memStore), drugH.ListDrugs)
		api.GET("/drugs/search", middleware.Auth(memStore), drugH.SearchDrugs)
		api.GET("/drugs/:id", middleware.Auth(memStore), drugH.GetDrug)
		api.POST("/drugs", middleware.Auth(memStore), middleware.RequireRole("manager", "pharmacist"), drugH.CreateDrug)
		api.PUT("/drugs/:id", middleware.Auth(memStore), middleware.RequireRole("manager", "pharmacist"), drugH.UpdateDrug)
		api.POST("/drugs/:id/stock-in", middleware.Auth(memStore), middleware.RequireRole("manager", "pharmacist"), drugH.StockIn)
		api.GET("/drugs/alerts/list", middleware.Auth(memStore), drugH.GetAlerts)
		api.GET("/drugs/:id/batches", middleware.Auth(memStore), drugH.ListBatches)
		api.POST("/drugs/temperature/record", middleware.Auth(memStore), middleware.RequireRole("pharmacist"), drugH.RecordTemperature)
		api.GET("/drugs/:id/temperature", middleware.Auth(memStore), drugH.GetTemperatureRecords)

		rxH := handler.NewRxHandler(memStore)
		api.GET("/rx", middleware.Auth(memStore), rxH.ListRx)
		api.GET("/rx/:id", middleware.Auth(memStore), rxH.GetRx)
		api.POST("/rx", middleware.Auth(memStore), middleware.RequireRole("pharmacist"), rxH.CreateRx)
		api.POST("/rx/:id/verify", middleware.Auth(memStore), middleware.RequireRole("pharmacist"), rxH.VerifyRx)
		api.POST("/rx/:id/dispense", middleware.Auth(memStore), middleware.RequireRole("pharmacist"), rxH.DispenseRx)
		api.POST("/rx/:id/insurance", middleware.Auth(memStore), middleware.RequireRole("cashier", "pharmacist"), rxH.SubmitInsurance)
		api.POST("/rx/:id/void", middleware.Auth(memStore), middleware.RequireRole("pharmacist"), rxH.VoidRx)
		api.POST("/rx/:id/handover/initiate", middleware.Auth(memStore), rxH.InitiateHandover)
		api.POST("/rx/:id/handover/accept", middleware.Auth(memStore), rxH.AcceptHandover)
		api.GET("/rx/handover/pending", middleware.Auth(memStore), rxH.ListPendingHandovers)

		insH := handler.NewInsuranceHandler(memStore)
		api.GET("/insurance/settlements", middleware.Auth(memStore), insH.ListSettlements)
		api.GET("/insurance/settlements/:id", middleware.Auth(memStore), insH.GetSettlement)
		api.POST("/insurance/settlements/monthly", middleware.Auth(memStore), middleware.RequireRole("manager", "cashier"), insH.GenerateMonthlySettlement)
		api.POST("/insurance/reconcile", middleware.Auth(memStore), middleware.RequireRole("manager"), insH.Reconcile)
		api.GET("/insurance/discrepancies", middleware.Auth(memStore), middleware.RequireRole("manager"), insH.ListDiscrepancies)
		api.POST("/insurance/catalog/sync", middleware.Auth(memStore), middleware.RequireRole("manager"), insH.SyncCatalog)
		api.GET("/insurance/catalog", middleware.Auth(memStore), insH.ListCatalog)

		schedH := handler.NewScheduleHandler(memStore)
		api.GET("/schedule", middleware.Auth(memStore), schedH.ListSchedule)
		api.POST("/schedule", middleware.Auth(memStore), middleware.RequireRole("manager"), schedH.CreateShift)
		api.PUT("/schedule/:id", middleware.Auth(memStore), middleware.RequireRole("manager"), schedH.UpdateShift)
		api.DELETE("/schedule/:id", middleware.Auth(memStore), middleware.RequireRole("manager"), schedH.DeleteShift)
		api.GET("/schedule/swaps", middleware.Auth(memStore), schedH.ListSwaps)
		api.POST("/schedule/swaps", middleware.Auth(memStore), schedH.RequestSwap)
		api.POST("/schedule/swaps/:id/confirm", middleware.Auth(memStore), schedH.ConfirmSwap)
		api.POST("/schedule/swaps/:id/approve", middleware.Auth(memStore), middleware.RequireRole("manager"), schedH.ApproveSwap)
		api.POST("/schedule/swaps/:id/reject", middleware.Auth(memStore), middleware.RequireRole("manager"), schedH.RejectSwap)
		api.GET("/schedule/swaps/history", middleware.Auth(memStore), schedH.ListSwapHistory)

		gspH := handler.NewGSPHandler(memStore)
		api.GET("/gsp/ledger", middleware.Auth(memStore), middleware.RequireRole("manager"), gspH.GetLedger)
		api.POST("/gsp/ledger/export", middleware.Auth(memStore), middleware.RequireRole("manager"), gspH.ExportLedger)
		api.GET("/gsp/archive/list", middleware.Auth(memStore), middleware.RequireRole("manager"), gspH.ListArchives)

		transferH := handler.NewTransferHandler(memStore)
		api.GET("/transfers", middleware.Auth(memStore), transferH.ListTransfers)
		api.GET("/transfers/:id", middleware.Auth(memStore), transferH.GetTransfer)
		api.POST("/transfers", middleware.Auth(memStore), middleware.RequireRole("manager", "pharmacist"), transferH.CreateTransfer)
		api.POST("/transfers/:id/sign-out", middleware.Auth(memStore), middleware.RequireRole("pharmacist"), transferH.SignOut)
		api.POST("/transfers/:id/sign-in", middleware.Auth(memStore), middleware.RequireRole("pharmacist"), transferH.SignIn)
		api.GET("/transfers/report/monthly", middleware.Auth(memStore), middleware.RequireRole("manager"), transferH.MonthlyReport)
	}

	port := cfg.Port
	if port == "" {
		port = "8080"
	}
	log.Printf("Server starting on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
