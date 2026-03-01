import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import {
  useDashboardKpis,
  useMonthlyTrends,
  useReasonDistribution,
  useLocationDistribution,
  useStrActionDistribution,
  useYearlyComparison,
} from '../hooks/useDashboardData';
import { KpiCard } from '../components/dashboard/KpiCard';
import { ChartContainer } from '../components/dashboard/ChartContainer';
import { SectionTitle } from '../components/common/SectionTitle';
import {
  REASON_LABELS,
  LOCATION_LABELS,
  STR_COMMITTEE_ACTION_LABELS,
} from '../lib/constants';
import type { PstrReason, LocationType, StrCommitteeAction } from '../types/database';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// ---------------------------------------------------------------------------
// Solaire palette for charts
// ---------------------------------------------------------------------------
const CHART_COLORS = [
  '#E84C22', // Primary Red-Orange
  '#B64926', // Divider/Title
  '#FF8427', // Orange
  '#FFBD47', // Gold/Amber
  '#505046', // Charcoal
  '#008000', // Success Green
  '#B22600', // Deep Red
];

const CHART_FONT = {
  family: "Aptos, Calibri, sans-serif",
  size: 10,
  weight: 'bold' as const,
};

const COMMON_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        font: CHART_FONT,
        color: '#505046',
      },
    },
    tooltip: {
      titleFont: CHART_FONT,
      bodyFont: { ...CHART_FONT, weight: 'normal' as const },
    },
  },
  scales: {
    x: {
      ticks: { font: CHART_FONT, color: '#505046' },
      grid: { display: false },
    },
    y: {
      ticks: { font: CHART_FONT, color: '#505046' },
      grid: { color: 'rgba(80,80,70,0.08)' },
    },
  },
};

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------
function SkeletonKpi() {
  return (
    <div className="kpi-card" style={{ minHeight: 100, opacity: 0.5 }}>
      <div className="kpi-label" style={{ width: '60%', height: 12, background: '#e0ddd4', borderRadius: 4 }} />
      <div className="kpi-value" style={{ width: '40%', height: 28, background: '#e0ddd4', borderRadius: 4, marginTop: 8 }} />
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="chart-container" style={{ minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
      <span style={{ color: '#8a8a7e', fontSize: '0.875rem' }}>Loading chart data...</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function resolveReasonLabel(key: string): string {
  return REASON_LABELS[key as PstrReason] ?? key;
}

function resolveLocationLabel(key: string): string {
  return LOCATION_LABELS[key as LocationType] ?? key;
}

function resolveStrActionLabel(key: string): string {
  return STR_COMMITTEE_ACTION_LABELS[key as StrCommitteeAction] ?? key;
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function DashboardPage() {
  const kpis = useDashboardKpis();
  const trends = useMonthlyTrends();
  const reasonDist = useReasonDistribution();
  const locationDist = useLocationDistribution();
  const strActionDist = useStrActionDistribution();
  const yearlyComp = useYearlyComparison();

  const isLoading =
    kpis.isLoading ||
    trends.isLoading ||
    reasonDist.isLoading ||
    locationDist.isLoading ||
    strActionDist.isLoading ||
    yearlyComp.isLoading;

  const hasError =
    kpis.isError ||
    trends.isError ||
    reasonDist.isError ||
    locationDist.isError ||
    strActionDist.isError ||
    yearlyComp.isError;

  // -------------------------------------------------------------------------
  // KPI section
  // -------------------------------------------------------------------------
  const renderKpis = () => {
    if (kpis.isLoading) {
      return (
        <div className="kpi-grid">
          <SkeletonKpi />
          <SkeletonKpi />
          <SkeletonKpi />
          <SkeletonKpi />
        </div>
      );
    }

    if (!kpis.data) return null;
    const d = kpis.data;

    return (
      <div className="kpi-grid">
        <KpiCard
          label="Total PSTRs"
          value={d.totalPstrs}
          subtitle={`${d.monthlyVolume} this month`}
          accentColor="#E84C22"
        />
        <KpiCard
          label="High Risk"
          value={d.highRiskCount}
          accentColor="#B22600"
        />
        <KpiCard
          label="Submitted to AMLC"
          value={d.submittedToAmlc}
          accentColor="#FF8427"
        />
        <KpiCard
          label="Pending Actions"
          value={d.pendingActions}
          subtitle="Awaiting STR Committee decision"
          accentColor="#FFBD47"
        />
      </div>
    );
  };

  // -------------------------------------------------------------------------
  // Charts
  // -------------------------------------------------------------------------

  // 1. PSTR Volume by Month — Bar
  const renderVolumeChart = () => {
    if (trends.isLoading) return <SkeletonChart />;
    if (!trends.data || trends.data.length === 0) {
      return (
        <ChartContainer title="PSTR Volume by Month">
          <div className="empty-state" style={{ minHeight: 200 }}>
            <p className="empty-state__description">No monthly trend data available.</p>
          </div>
        </ChartContainer>
      );
    }

    return (
      <ChartContainer title="PSTR Volume by Month" subtitle="Monthly filing count">
        <div style={{ height: 300 }}>
          <Bar
            data={{
              labels: trends.data.map((t) => t.month),
              datasets: [
                {
                  label: 'PSTRs Filed',
                  data: trends.data.map((t) => t.count),
                  backgroundColor: '#E84C22',
                  borderRadius: 4,
                },
              ],
            }}
            options={{
              ...COMMON_OPTIONS,
              plugins: {
                ...COMMON_OPTIONS.plugins,
                legend: { display: false },
              },
            }}
          />
        </div>
      </ChartContainer>
    );
  };

  // 2. Transaction Amount Trends — Line
  const renderAmountTrendChart = () => {
    if (trends.isLoading) return <SkeletonChart />;
    if (!trends.data || trends.data.length === 0) {
      return (
        <ChartContainer title="Transaction Amount Trends">
          <div className="empty-state" style={{ minHeight: 200 }}>
            <p className="empty-state__description">No transaction amount data available.</p>
          </div>
        </ChartContainer>
      );
    }

    return (
      <ChartContainer title="Transaction Amount Trends" subtitle="Aggregate monthly amounts (PHP)">
        <div style={{ height: 300 }}>
          <Line
            data={{
              labels: trends.data.map((t) => t.month),
              datasets: [
                {
                  label: 'Total Amount',
                  data: trends.data.map((t) => t.amount),
                  borderColor: '#FFBD47',
                  backgroundColor: 'rgba(255, 189, 71, 0.15)',
                  fill: true,
                  tension: 0.3,
                  pointBackgroundColor: '#FFBD47',
                  pointBorderColor: '#FFBD47',
                  pointRadius: 3,
                },
              ],
            }}
            options={{
              ...COMMON_OPTIONS,
              plugins: {
                ...COMMON_OPTIONS.plugins,
                legend: { display: false },
              },
              scales: {
                ...COMMON_OPTIONS.scales,
                y: {
                  ...COMMON_OPTIONS.scales.y,
                  ticks: {
                    ...COMMON_OPTIONS.scales.y.ticks,
                    callback: (value) => formatCompact(Number(value)),
                  },
                },
              },
            }}
          />
        </div>
      </ChartContainer>
    );
  };

  // 3. Reason Distribution — Doughnut
  const renderReasonChart = () => {
    if (reasonDist.isLoading) return <SkeletonChart />;
    if (!reasonDist.data || reasonDist.data.length === 0) {
      return (
        <ChartContainer title="Reason Distribution">
          <div className="empty-state" style={{ minHeight: 200 }}>
            <p className="empty-state__description">No reason data available.</p>
          </div>
        </ChartContainer>
      );
    }

    return (
      <ChartContainer title="Reason Distribution" subtitle="PSTR filing reasons breakdown">
        <div style={{ height: 300 }}>
          <Doughnut
            data={{
              labels: reasonDist.data.map((d) => resolveReasonLabel(d.label)),
              datasets: [
                {
                  data: reasonDist.data.map((d) => d.value),
                  backgroundColor: CHART_COLORS.slice(0, reasonDist.data.length),
                  borderWidth: 2,
                  borderColor: '#FFFFFF',
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'right' as const,
                  labels: {
                    font: { ...CHART_FONT, size: 11 },
                    color: '#505046',
                    padding: 12,
                    boxWidth: 14,
                  },
                },
                tooltip: {
                  titleFont: CHART_FONT,
                  bodyFont: { ...CHART_FONT, weight: 'normal' as const },
                },
              },
            }}
          />
        </div>
      </ChartContainer>
    );
  };

  // 4. Red Flag Distribution — Placeholder
  const renderRedFlagPlaceholder = () => (
    <ChartContainer title="Red Flag Distribution" subtitle="Coming soon">
      <div className="empty-state" style={{ minHeight: 200 }}>
        <p className="empty-state__description">
          Red flag analysis will be available in a future update.
        </p>
      </div>
    </ChartContainer>
  );

  // 5. STR Committee Action — Horizontal Bar
  const renderStrActionChart = () => {
    if (strActionDist.isLoading) return <SkeletonChart />;
    if (!strActionDist.data || strActionDist.data.length === 0) {
      return (
        <ChartContainer title="STR Committee Action">
          <div className="empty-state" style={{ minHeight: 200 }}>
            <p className="empty-state__description">No STR action data available.</p>
          </div>
        </ChartContainer>
      );
    }

    return (
      <ChartContainer title="STR Committee Action" subtitle="Disposition breakdown">
        <div style={{ height: 300 }}>
          <Bar
            data={{
              labels: strActionDist.data.map((d) => resolveStrActionLabel(d.label)),
              datasets: [
                {
                  label: 'Count',
                  data: strActionDist.data.map((d) => d.value),
                  backgroundColor: ['#B22600', '#FF8427', '#505046', '#FFBD47'].slice(
                    0,
                    strActionDist.data.length
                  ),
                  borderRadius: 4,
                },
              ],
            }}
            options={{
              ...COMMON_OPTIONS,
              indexAxis: 'y' as const,
              plugins: {
                ...COMMON_OPTIONS.plugins,
                legend: { display: false },
              },
            }}
          />
        </div>
      </ChartContainer>
    );
  };

  // 6. Location Breakdown — Doughnut
  const renderLocationChart = () => {
    if (locationDist.isLoading) return <SkeletonChart />;
    if (!locationDist.data || locationDist.data.length === 0) {
      return (
        <ChartContainer title="Location Breakdown">
          <div className="empty-state" style={{ minHeight: 200 }}>
            <p className="empty-state__description">No location data available.</p>
          </div>
        </ChartContainer>
      );
    }

    return (
      <ChartContainer title="Location Breakdown" subtitle="PSTRs by venue">
        <div style={{ height: 300 }}>
          <Doughnut
            data={{
              labels: locationDist.data.map((d) => resolveLocationLabel(d.label)),
              datasets: [
                {
                  data: locationDist.data.map((d) => d.value),
                  backgroundColor: ['#E84C22', '#FF8427', '#FFBD47', '#008000', '#505046'].slice(
                    0,
                    locationDist.data.length
                  ),
                  borderWidth: 2,
                  borderColor: '#FFFFFF',
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'right' as const,
                  labels: {
                    font: { ...CHART_FONT, size: 11 },
                    color: '#505046',
                    padding: 12,
                    boxWidth: 14,
                  },
                },
                tooltip: {
                  titleFont: CHART_FONT,
                  bodyFont: { ...CHART_FONT, weight: 'normal' as const },
                },
              },
            }}
          />
        </div>
      </ChartContainer>
    );
  };

  // 7. Year-over-Year — Grouped Bar
  const renderYearlyChart = () => {
    if (yearlyComp.isLoading) return <SkeletonChart />;
    if (!yearlyComp.data || yearlyComp.data.length === 0) {
      return (
        <ChartContainer title="Year-over-Year Comparison">
          <div className="empty-state" style={{ minHeight: 200 }}>
            <p className="empty-state__description">No yearly comparison data available.</p>
          </div>
        </ChartContainer>
      );
    }

    return (
      <ChartContainer title="Year-over-Year Comparison" subtitle="Annual PSTR volume">
        <div style={{ height: 300 }}>
          <Bar
            data={{
              labels: yearlyComp.data.map((d) => d.label),
              datasets: [
                {
                  label: 'PSTRs',
                  data: yearlyComp.data.map((d) => d.value),
                  backgroundColor: yearlyComp.data.map(
                    (_, i) => CHART_COLORS[i % CHART_COLORS.length]
                  ),
                  borderRadius: 4,
                },
              ],
            }}
            options={{
              ...COMMON_OPTIONS,
              plugins: {
                ...COMMON_OPTIONS.plugins,
                legend: { display: false },
              },
            }}
          />
        </div>
      </ChartContainer>
    );
  };

  // 8. Risk Rating KPI cards
  const renderRiskRatingKpis = () => {
    if (!kpis.data) return null;
    const d = kpis.data;
    const total = d.totalPstrs || 1;

    return (
      <ChartContainer title="Disposition Summary" subtitle="STR Committee outcomes">
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <KpiCard
            label="Submitted to AMLC"
            value={d.submittedToAmlc}
            subtitle={`${((d.submittedToAmlc / total) * 100).toFixed(1)}% of total`}
            accentColor="#B22600"
          />
          <KpiCard
            label="For Monitoring"
            value={d.forMonitoring}
            subtitle={`${((d.forMonitoring / total) * 100).toFixed(1)}% of total`}
            accentColor="#FF8427"
          />
          <KpiCard
            label="Archived"
            value={d.archived}
            subtitle={`${((d.archived / total) * 100).toFixed(1)}% of total`}
            accentColor="#008000"
          />
        </div>
      </ChartContainer>
    );
  };

  // -------------------------------------------------------------------------
  // Error state
  // -------------------------------------------------------------------------
  if (hasError && !isLoading) {
    return (
      <div>
        <SectionTitle>Dashboard</SectionTitle>
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <p style={{ color: '#B22600', fontWeight: 600, marginBottom: 8 }}>
            Failed to load dashboard data.
          </p>
          <p style={{ color: '#8a8a7e', fontSize: '0.875rem' }}>
            Please check your connection and try refreshing the page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <SectionTitle>Dashboard</SectionTitle>

      {/* KPI Cards */}
      {renderKpis()}

      {/* Chart Grid */}
      <div className="chart-grid mt-lg">
        {renderVolumeChart()}
        {renderAmountTrendChart()}
        {renderReasonChart()}
        {renderRedFlagPlaceholder()}
        {renderStrActionChart()}
        {renderLocationChart()}
        {renderYearlyChart()}
        {kpis.isLoading ? <SkeletonChart /> : renderRiskRatingKpis()}
      </div>
    </div>
  );
}
