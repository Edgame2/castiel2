import { getDatabaseClient, NotFoundError } from '@coder/shared';

export class DashboardService {
  private db = getDatabaseClient();

  async createDashboard(input: { name: string; config?: any; organizationId?: string }) {
    return await this.db.dashboard_dashboards.create({
      data: {
        name: input.name,
        config: input.config,
        organizationId: input.organizationId,
      },
    });
  }

  async listDashboards(input: { organizationId?: string }) {
    const where: any = {};
    if (input.organizationId) where.organizationId = input.organizationId;
    return await this.db.dashboard_dashboards.findMany({ where });
  }

  async getDashboard(id: string) {
    return await this.db.dashboard_dashboards.findUnique({ where: { id } });
  }

  async updateDashboard(id: string, input: { name?: string; config?: any }) {
    const dashboard = await this.getDashboard(id);
    if (!dashboard) throw new NotFoundError('Dashboard', id);
    return await this.db.dashboard_dashboards.update({ where: { id }, data: input });
  }

  async deleteDashboard(id: string) {
    const dashboard = await this.getDashboard(id);
    if (!dashboard) throw new NotFoundError('Dashboard', id);
    await this.db.dashboard_dashboards.delete({ where: { id } });
  }
}
