import type { AIAnalysis, Report, User } from '../../types/scip.js';
import type { PaginationOptions, ScipRepository } from '../../database/repositories/ScipRepository.js';

type ReportRepository = Pick<
  ScipRepository,
  'getReports' | 'countReports' | 'getReportById' | 'getAIAnalysisForReport' | 'createReport' | 'updateReport'
>;

export class ReportAccessDeniedError extends Error {
  constructor() {
    super('Forbidden: You can only access your own reports.');
    this.name = 'ReportAccessDeniedError';
  }
}

export class ReportService {
  constructor(private readonly repository: ReportRepository) {}

  async listReports(
    filter: { citizenId?: string; category?: string; status?: string; urgency?: string },
    pagination: PaginationOptions
  ): Promise<{ reports: Report[]; total: number }> {
    const [reports, total] = await Promise.all([
      this.repository.getReports(filter, pagination),
      this.repository.countReports(filter)
    ]);
    return { reports, total };
  }

  async getReportDetails(
    reportId: string,
    user: Pick<User, 'id' | 'role'>
  ): Promise<{ report: Report; analysis: AIAnalysis | undefined } | undefined> {
    const report = await this.repository.getReportById(reportId);
    if (!report) return undefined;
    if (user.role === 'citizen' && report.citizenId !== user.id) throw new ReportAccessDeniedError();
    return {
      report,
      analysis: await this.repository.getAIAnalysisForReport(reportId)
    };
  }

  createReport(input: Omit<Report, 'id' | 'status' | 'createdAt' | 'updatedAt'>) {
    return this.repository.createReport(input);
  }

  updateReport(reportId: string, updates: Partial<Report>, user: User): Promise<Report> {
    return this.repository.updateReport(reportId, updates, user);
  }
}
