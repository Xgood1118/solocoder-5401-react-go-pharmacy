package store

import (
	"time"

	"pharmacy/internal/model"

	"golang.org/x/crypto/bcrypt"
)

func InitSeedData(s *MemoryStore) {
	pwdHash, _ := bcrypt.GenerateFromPassword([]byte("123456"), bcrypt.DefaultCost)

	now := time.Now()
	expires30 := now.AddDate(0, 1, 0)

	manager := &model.Staff{
		ID:                 "staff-001",
		Username:           "manager",
		Name:               "张店长",
		PasswordHash:       string(pwdHash),
		Role:               model.RoleManager,
		Phone:              "13800138000",
		Locked:             false,
		LastPasswordChange: now.AddDate(0, 0, -20),
		PasswordExpiresAt:  expires30,
		CreatedAt:          now.AddDate(0, 0, -100),
	}
	pharmacist := &model.Staff{
		ID:                 "staff-002",
		Username:           "pharmacist",
		Name:               "李药师",
		PasswordHash:       string(pwdHash),
		Role:               model.RolePharmacist,
		Phone:              "13800138001",
		Locked:             false,
		LastPasswordChange: now.AddDate(0, 0, -10),
		PasswordExpiresAt:  expires30,
		CreatedAt:          now.AddDate(0, 0, -90),
	}
	cashier := &model.Staff{
		ID:                 "staff-003",
		Username:           "cashier",
		Name:               "王收银",
		PasswordHash:       string(pwdHash),
		Role:               model.RoleCashier,
		Phone:              "13800138002",
		Locked:             false,
		LastPasswordChange: now.AddDate(0, 0, -5),
		PasswordExpiresAt:  expires30,
		CreatedAt:          now.AddDate(0, 0, -80),
	}
	pharmacist2 := &model.Staff{
		ID:                 "staff-004",
		Username:           "pharmacist2",
		Name:               "赵药师",
		PasswordHash:       string(pwdHash),
		Role:               model.RolePharmacist,
		Phone:              "13800138003",
		Locked:             false,
		LastPasswordChange: now.AddDate(0, 0, -15),
		PasswordExpiresAt:  expires30,
		CreatedAt:          now.AddDate(0, 0, -70),
	}
	cashier2 := &model.Staff{
		ID:                 "staff-005",
		Username:           "cashier2",
		Name:               "刘收银",
		PasswordHash:       string(pwdHash),
		Role:               model.RoleCashier,
		Phone:              "13800138004",
		Locked:             false,
		LastPasswordChange: now.AddDate(0, 0, -3),
		PasswordExpiresAt:  expires30,
		CreatedAt:          now.AddDate(0, 0, -60),
	}

	s.AddStaff(manager)
	s.AddStaff(pharmacist)
	s.AddStaff(cashier)
	s.AddStaff(pharmacist2)
	s.AddStaff(cashier2)

	drug1 := &model.Drug{
		ID:             "drug-001",
		ProductName:    "阿莫西林胶囊",
		GenericName:    "阿莫西林",
		GenericNameEn:  "amoxicillin",
		Specification:  "0.25g*24粒",
		Manufacturer:   "华北制药",
		IsPrescription: true,
		Category:       model.DrugCategoryNormal,
		StockMin:       50,
		StockMax:       500,
		CostPrice:      8.5,
		SalePrice:      15.8,
		InsuranceType:  "甲类",
		CreatedAt:      now.AddDate(0, 0, -50),
		UpdatedAt:      now.AddDate(0, 0, -50),
	}
	drug2 := &model.Drug{
		ID:             "drug-002",
		ProductName:    "布洛芬缓释胶囊",
		GenericName:    "布洛芬",
		GenericNameEn:  "ibuprofen",
		Specification:  "0.3g*20粒",
		Manufacturer:   "中美史克",
		IsPrescription: false,
		Category:       model.DrugCategoryNormal,
		StockMin:       30,
		StockMax:       300,
		CostPrice:      12.0,
		SalePrice:      22.5,
		InsuranceType:  "乙类",
		CreatedAt:      now.AddDate(0, 0, -45),
		UpdatedAt:      now.AddDate(0, 0, -45),
	}
	drug3 := &model.Drug{
		ID:             "drug-003",
		ProductName:    "精蛋白锌胰岛素注射液",
		GenericName:    "胰岛素",
		GenericNameEn:  "insulin",
		Specification:  "300U/3ml",
		Manufacturer:   "诺和诺德",
		IsPrescription: true,
		Category:       model.DrugCategoryColdChain,
		StockMin:       10,
		StockMax:       50,
		CostPrice:      85.0,
		SalePrice:      128.0,
		InsuranceType:  "甲类",
		CreatedAt:      now.AddDate(0, 0, -40),
		UpdatedAt:      now.AddDate(0, 0, -40),
	}
	drug4 := &model.Drug{
		ID:             "drug-004",
		ProductName:    "维生素C片",
		GenericName:    "维生素C",
		GenericNameEn:  "vitamin c",
		Specification:  "100mg*100片",
		Manufacturer:   "东北制药",
		IsPrescription: false,
		Category:       model.DrugCategoryNormal,
		StockMin:       100,
		StockMax:       1000,
		CostPrice:      3.5,
		SalePrice:      6.8,
		InsuranceType:  "丙类",
		CreatedAt:      now.AddDate(0, 0, -35),
		UpdatedAt:      now.AddDate(0, 0, -35),
	}
	drug5 := &model.Drug{
		ID:             "drug-005",
		ProductName:    "阿莫西林颗粒",
		GenericName:    "阿莫西林",
		GenericNameEn:  "amoxicillin",
		Specification:  "0.125g*12袋",
		Manufacturer:   "葵花药业",
		IsPrescription: true,
		Category:       model.DrugCategoryNormal,
		StockMin:       40,
		StockMax:       400,
		CostPrice:      6.0,
		SalePrice:      12.0,
		InsuranceType:  "甲类",
		CreatedAt:      now.AddDate(0, 0, -30),
		UpdatedAt:      now.AddDate(0, 0, -30),
	}
	drug6 := &model.Drug{
		ID:             "drug-006",
		ProductName:    "重组人干扰素α2b注射液",
		GenericName:    "干扰素",
		GenericNameEn:  "interferon",
		Specification:  "300万IU/1ml",
		Manufacturer:   "凯因科技",
		IsPrescription: true,
		Category:       model.DrugCategoryColdChain,
		StockMin:       5,
		StockMax:       30,
		CostPrice:      150.0,
		SalePrice:      238.0,
		InsuranceType:  "乙类",
		CreatedAt:      now.AddDate(0, 0, -25),
		UpdatedAt:      now.AddDate(0, 0, -25),
	}

	s.AddDrug(drug1)
	s.AddDrug(drug2)
	s.AddDrug(drug3)
	s.AddDrug(drug4)
	s.AddDrug(drug5)
	s.AddDrug(drug6)

	batch1 := &model.DrugBatch{
		ID:         "batch-001",
		DrugID:     "drug-001",
		BatchNo:    "20240101",
		ExpiryDate: now.AddDate(0, 6, 0),
		Stock:      200,
		InDate:     now.AddDate(0, 0, -30),
		InOperator: "staff-001",
	}
	batch2 := &model.DrugBatch{
		ID:         "batch-002",
		DrugID:     "drug-001",
		BatchNo:    "20240315",
		ExpiryDate: now.AddDate(0, 9, 0),
		Stock:      150,
		InDate:     now.AddDate(0, 0, -10),
		InOperator: "staff-002",
	}
	batch3 := &model.DrugBatch{
		ID:         "batch-003",
		DrugID:     "drug-002",
		BatchNo:    "20240201",
		ExpiryDate: now.AddDate(0, 8, 0),
		Stock:      100,
		InDate:     now.AddDate(0, 0, -25),
		InOperator: "staff-001",
	}
	batch4 := &model.DrugBatch{
		ID:         "batch-004",
		DrugID:     "drug-003",
		BatchNo:    "20240401",
		ExpiryDate: now.AddDate(0, 2, 0),
		Stock:      20,
		InDate:     now.AddDate(0, 0, -20),
		InOperator: "staff-002",
	}
	batch5 := &model.DrugBatch{
		ID:         "batch-005",
		DrugID:     "drug-004",
		BatchNo:    "20240301",
		ExpiryDate: now.AddDate(0, 12, 0),
		Stock:      500,
		InDate:     now.AddDate(0, 0, -15),
		InOperator: "staff-001",
	}
	batch6 := &model.DrugBatch{
		ID:         "batch-006",
		DrugID:     "drug-005",
		BatchNo:    "20240215",
		ExpiryDate: now.AddDate(0, 5, 0),
		Stock:      180,
		InDate:     now.AddDate(0, 0, -28),
		InOperator: "staff-002",
	}
	batch7 := &model.DrugBatch{
		ID:         "batch-007",
		DrugID:     "drug-006",
		BatchNo:    "20240410",
		ExpiryDate: now.AddDate(0, 3, 0),
		Stock:      15,
		InDate:     now.AddDate(0, 0, -12),
		InOperator: "staff-002",
	}

	s.AddBatch(batch1)
	s.AddBatch(batch2)
	s.AddBatch(batch3)
	s.AddBatch(batch4)
	s.AddBatch(batch5)
	s.AddBatch(batch6)
	s.AddBatch(batch7)

	catalog1 := &model.InsuranceCatalogItem{
		ID:           "cat-001",
		DrugID:       "drug-001",
		DrugName:     "阿莫西林胶囊",
		GenericName:  "阿莫西林",
		Category:     "甲类",
		SelfPayRatio: 0,
		MaxPrice:     20.0,
	}
	catalog2 := &model.InsuranceCatalogItem{
		ID:           "cat-002",
		DrugID:       "drug-002",
		DrugName:     "布洛芬缓释胶囊",
		GenericName:  "布洛芬",
		Category:     "乙类",
		SelfPayRatio: 0.10,
		MaxPrice:     25.0,
	}
	catalog3 := &model.InsuranceCatalogItem{
		ID:           "cat-003",
		DrugID:       "drug-003",
		DrugName:     "精蛋白锌胰岛素注射液",
		GenericName:  "胰岛素",
		Category:     "甲类",
		SelfPayRatio: 0,
		MaxPrice:     150.0,
	}
	catalog4 := &model.InsuranceCatalogItem{
		ID:           "cat-004",
		DrugID:       "drug-005",
		DrugName:     "阿莫西林颗粒",
		GenericName:  "阿莫西林",
		Category:     "甲类",
		SelfPayRatio: 0,
		MaxPrice:     15.0,
	}
	catalog5 := &model.InsuranceCatalogItem{
		ID:           "cat-005",
		DrugID:       "drug-006",
		DrugName:     "重组人干扰素α2b注射液",
		GenericName:  "干扰素",
		Category:     "乙类",
		SelfPayRatio: 0.10,
		MaxPrice:     260.0,
	}

	s.AddCatalogItem(catalog1)
	s.AddCatalogItem(catalog2)
	s.AddCatalogItem(catalog3)
	s.AddCatalogItem(catalog4)
	s.AddCatalogItem(catalog5)

	today := now.Format("2006-01-02")
	yesterday := now.AddDate(0, 0, -1).Format("2006-01-02")
	tomorrow := now.AddDate(0, 0, 1).Format("2006-01-02")

	shift1 := &model.Shift{
		ID:        "shift-001",
		Date:      today,
		ShiftType: model.ShiftMorning,
		StaffID:   "staff-002",
		StaffName: "李药师",
		CreatedAt: now.AddDate(0, 0, -7),
	}
	shift2 := &model.Shift{
		ID:        "shift-002",
		Date:      today,
		ShiftType: model.ShiftNoon,
		StaffID:   "staff-003",
		StaffName: "王收银",
		CreatedAt: now.AddDate(0, 0, -7),
	}
	shift3 := &model.Shift{
		ID:        "shift-003",
		Date:      today,
		ShiftType: model.ShiftEvening,
		StaffID:   "staff-004",
		StaffName: "赵药师",
		CreatedAt: now.AddDate(0, 0, -7),
	}
	shift4 := &model.Shift{
		ID:        "shift-004",
		Date:      yesterday,
		ShiftType: model.ShiftMorning,
		StaffID:   "staff-002",
		StaffName: "李药师",
		CreatedAt: now.AddDate(0, 0, -8),
	}
	shift5 := &model.Shift{
		ID:        "shift-005",
		Date:      tomorrow,
		ShiftType: model.ShiftMorning,
		StaffID:   "staff-004",
		StaffName: "赵药师",
		CreatedAt: now.AddDate(0, 0, -6),
	}
	shift6 := &model.Shift{
		ID:        "shift-006",
		Date:      tomorrow,
		ShiftType: model.ShiftNoon,
		StaffID:   "staff-005",
		StaffName: "刘收银",
		CreatedAt: now.AddDate(0, 0, -6),
	}

	s.AddShift(shift1)
	s.AddShift(shift2)
	s.AddShift(shift3)
	s.AddShift(shift4)
	s.AddShift(shift5)
	s.AddShift(shift6)

	tempRec1 := &model.TemperatureRecord{
		ID:         "temp-001",
		DrugID:     "drug-003",
		BatchID:    "batch-004",
		Temp:       5.2,
		RecordTime: now.Add(-2 * time.Hour),
		SensorID:   "sensor-001",
	}
	tempRec2 := &model.TemperatureRecord{
		ID:         "temp-002",
		DrugID:     "drug-003",
		BatchID:    "batch-004",
		Temp:       4.8,
		RecordTime: now.Add(-90 * time.Minute),
		SensorID:   "sensor-001",
	}
	tempRec3 := &model.TemperatureRecord{
		ID:         "temp-003",
		DrugID:     "drug-003",
		BatchID:    "batch-004",
		Temp:       5.5,
		RecordTime: now.Add(-30 * time.Minute),
		SensorID:   "sensor-001",
	}
	tempRec4 := &model.TemperatureRecord{
		ID:         "temp-004",
		DrugID:     "drug-006",
		BatchID:    "batch-007",
		Temp:       6.0,
		RecordTime: now.Add(-1 * time.Hour),
		SensorID:   "sensor-002",
	}

	s.AddTemperatureRecord(tempRec1)
	s.AddTemperatureRecord(tempRec2)
	s.AddTemperatureRecord(tempRec3)
	s.AddTemperatureRecord(tempRec4)

	rxItems := []model.RxItem{
		{
			DrugID:        "drug-001",
			DrugName:      "阿莫西林胶囊",
			Specification: "0.25g*24粒",
			Quantity:      2,
			UnitPrice:     15.8,
			Amount:        31.6,
		},
		{
			DrugID:        "drug-002",
			DrugName:      "布洛芬缓释胶囊",
			Specification: "0.3g*20粒",
			Quantity:      1,
			UnitPrice:     22.5,
			Amount:        22.5,
		},
	}

	rx1 := &model.Rx{
		ID:                "rx-001",
		RxNo:              "RX20240601001",
		PatientName:       "张三",
		PatientIDCard:    "110101199001011234",
		DoctorName:        "陈医生",
		Hospital:          "社区医院",
		Items:             rxItems,
		TotalAmount:       54.1,
		InsuranceAmount:   47.85,
		SelfPayAmount:     6.25,
		Status:            model.RxStatusCompleted,
		OperatorID:        "staff-002",
		OperatorName:      "李药师",
		CurrentHolderID:   "staff-002",
		CurrentHolderName: "李药师",
		InsuranceClaimNo: "INS20240601001",
		QrCode:            "rx-qr-001",
		Actions: []model.RxActionLog{
			{Action: "创建处方", OperatorID: "staff-002", OperatorName: "李药师", Timestamp: now.AddDate(0, 0, -1).Add(-3 * time.Hour)},
			{Action: "核方通过", OperatorID: "staff-002", OperatorName: "李药师", Timestamp: now.AddDate(0, 0, -1).Add(-2 * time.Hour)},
			{Action: "发药", OperatorID: "staff-002", OperatorName: "李药师", Timestamp: now.AddDate(0, 0, -1).Add(-1 * time.Hour)},
			{Action: "医保上传", OperatorID: "staff-003", OperatorName: "王收银", Timestamp: now.AddDate(0, 0, -1).Add(-30 * time.Minute)},
		},
		CreatedAt: now.AddDate(0, 0, -1).Add(-3 * time.Hour),
		UpdatedAt: now.AddDate(0, 0, -1).Add(-30 * time.Minute),
	}

	rx2Items := []model.RxItem{
		{
			DrugID:        "drug-003",
			DrugName:      "精蛋白锌胰岛素注射液",
			Specification: "300U/3ml",
			Quantity:      1,
			UnitPrice:     128.0,
			Amount:        128.0,
		},
	}
	rx2 := &model.Rx{
		ID:                "rx-002",
		RxNo:              "RX20240609001",
		PatientName:       "李四",
		PatientIDCard:    "110101198505055678",
		DoctorName:        "王医生",
		Hospital:          "市人民医院",
		Items:             rx2Items,
		TotalAmount:       128.0,
		InsuranceAmount:   128.0,
		SelfPayAmount:     0,
		Status:            model.RxStatusVerified,
		OperatorID:        "staff-004",
		OperatorName:      "赵药师",
		CurrentHolderID:   "staff-004",
		CurrentHolderName: "赵药师",
		QrCode:            "rx-qr-002",
		Actions: []model.RxActionLog{
			{Action: "创建处方", OperatorID: "staff-004", OperatorName: "赵药师", Timestamp: now.Add(-2 * time.Hour)},
			{Action: "核方通过", OperatorID: "staff-004", OperatorName: "赵药师", Timestamp: now.Add(-1 * time.Hour)},
		},
		CreatedAt: now.Add(-2 * time.Hour),
		UpdatedAt: now.Add(-1 * time.Hour),
	}

	s.AddRx(rx1)
	s.AddRx(rx2)
}
