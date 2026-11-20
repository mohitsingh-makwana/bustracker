package com.bustrackr.service;

import com.bustrackr.dto.admin.AdminDashboardSummaryResponse;
import org.springframework.stereotype.Service;

@Service
public interface AdminService {
    AdminDashboardSummaryResponse getDashboardSummary();
}
