// public/js/charts.js
// Statistics and charts with Chart.js

import {
    Chart,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';

// Register components
Chart.register(
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

class ChartManager {
    constructor() {
        this.charts = new Map();
        this.defaultColors = [
            '#667eea',
            '#764ba2',
            '#f093fb',
            '#4facfe',
            '#43e97b',
            '#fa709a',
            '#fee140',
            '#30cfd0'
        ];
    }

    // Create language statistics chart
    createLanguageChart(canvasId, languageData) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        const chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(languageData),
                datasets: [{
                    data: Object.values(languageData),
                    backgroundColor: this.defaultColors,
                    borderWidth: 2,
                    borderColor: '#1e1e1e'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: '#ffffff',
                            font: {
                                size: 12
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: '언어별 파일 분포',
                        color: '#ffffff',
                        font: {
                            size: 16
                        }
                    }
                }
            }
        });

        this.charts.set(canvasId, chart);
        return chart;
    }

    // Create file size chart
    createFileSizeChart(canvasId, fileData) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: fileData.map(f => f.name),
                datasets: [{
                    label: '파일 크기 (KB)',
                    data: fileData.map(f => f.size / 1024),
                    backgroundColor: '#667eea',
                    borderColor: '#5568d3',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#ffffff'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#ffffff'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: '#ffffff'
                        }
                    },
                    title: {
                        display: true,
                        text: '파일 크기 분석',
                        color: '#ffffff',
                        font: {
                            size: 16
                        }
                    }
                }
            }
        });

        this.charts.set(canvasId, chart);
        return chart;
    }

    // Create commit activity chart
    createCommitChart(canvasId, commitData) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: commitData.map(c => c.date),
                datasets: [{
                    label: '커밋 수',
                    data: commitData.map(c => c.count),
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#ffffff',
                            stepSize: 1
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#ffffff'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: '#ffffff'
                        }
                    },
                    title: {
                        display: true,
                        text: '커밋 활동',
                        color: '#ffffff',
                        font: {
                            size: 16
                        }
                    }
                }
            }
        });

        this.charts.set(canvasId, chart);
        return chart;
    }

    // Create code complexity chart
    createComplexityChart(canvasId, complexityData) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        const chart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['복잡도', '가독성', '유지보수성', '성능', '보안'],
                datasets: [{
                    label: '코드 품질',
                    data: complexityData,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.2)',
                    pointBackgroundColor: '#667eea',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: '#667eea'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            color: '#ffffff'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        pointLabels: {
                            color: '#ffffff'
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: '#ffffff'
                        }
                    },
                    title: {
                        display: true,
                        text: '코드 품질 분석',
                        color: '#ffffff',
                        font: {
                            size: 16
                        }
                    }
                }
            }
        });

        this.charts.set(canvasId, chart);
        return chart;
    }

    // Show statistics modal
    showStatisticsModal(stats) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 900px; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header">
                    <h2>📊 프로젝트 통계</h2>
                    <button class="modal-close" id="stats-modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px;">
                        <div style="background: var(--hover-background); padding: 20px; border-radius: 8px;">
                            <h3 style="margin: 0 0 10px 0;">📁 총 파일</h3>
                            <p style="font-size: 32px; font-weight: bold; margin: 0;">${stats.totalFiles || 0}</p>
                        </div>
                        <div style="background: var(--hover-background); padding: 20px; border-radius: 8px;">
                            <h3 style="margin: 0 0 10px 0;">📝 코드 라인</h3>
                            <p style="font-size: 32px; font-weight: bold; margin: 0;">${stats.totalLines || 0}</p>
                        </div>
                        <div style="background: var(--hover-background); padding: 20px; border-radius: 8px;">
                            <h3 style="margin: 0 0 10px 0;">💾 총 크기</h3>
                            <p style="font-size: 32px; font-weight: bold; margin: 0;">${this.formatBytes(stats.totalSize || 0)}</p>
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                        <div>
                            <canvas id="stats-language-chart"></canvas>
                        </div>
                        <div>
                            <canvas id="stats-size-chart"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Create charts
        if (stats.languages) {
            this.createLanguageChart('stats-language-chart', stats.languages);
        }
        if (stats.files) {
            this.createFileSizeChart('stats-size-chart', stats.files.slice(0, 10));
        }

        // Event listeners
        document.getElementById('stats-modal-close').addEventListener('click', () => {
            this.destroyChart('stats-language-chart');
            this.destroyChart('stats-size-chart');
            modal.remove();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.destroyChart('stats-language-chart');
                this.destroyChart('stats-size-chart');
                modal.remove();
            }
        });
    }

    // Format bytes
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    // Destroy chart
    destroyChart(canvasId) {
        const chart = this.charts.get(canvasId);
        if (chart) {
            chart.destroy();
            this.charts.delete(canvasId);
        }
    }

    // Destroy all charts
    destroyAll() {
        this.charts.forEach(chart => chart.destroy());
        this.charts.clear();
    }
}

export const charts = new ChartManager();
export default charts;
