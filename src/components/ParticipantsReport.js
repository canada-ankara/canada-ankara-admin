import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Chart from 'chart.js/auto';
import { Chart as ChartJS } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

ChartJS.register(ChartDataLabels);

const ParticipantsReport = ({ isOpen, onClose, guests, stats, setStats, pieChartRef, barChartRef, lineChartRef, donutChartRef, reportRef }) => {
  const { t } = useTranslation();

  const handleExportToPDF = async () => {
    const element = reportRef.current;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const margin = 10;
    const contentWidth = pageWidth - 2 * margin;

    // Capture the entire report content
    const canvas = await html2canvas(element, {
      scale: 2, // Increase resolution
      useCORS: true,
      backgroundColor: '#000000', // Match modal background
    });

    const imgData = canvas.toDataURL('image/png');
    const imgProps = pdf.getImageProperties(imgData);
    const imgHeight = (imgProps.height * contentWidth) / imgProps.width;
    let heightLeft = imgHeight;
    let position = 0;

    // Add title
    pdf.setFontSize(16);
    pdf.text(t('participantReport'), margin, 15);

    // Add the image to the PDF
    pdf.addImage(imgData, 'PNG', margin, 20, contentWidth, imgHeight);
    heightLeft -= (pageHeight - 20);

    // Handle multi-page content
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', margin, position, contentWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // Save the PDF
    pdf.save('ParticipantReport.pdf');
  };

  useEffect(() => {
    if (isOpen && guests.length > 0) {
      // Calculate statistics
      const willAttendCount = guests.filter(g => g.willAttend).length;
      const checkedInCount = guests.filter(g => g.isCheckedIn).length;
      const notCheckedInCount = guests.filter(g => !g.isCheckedIn).length;
      const respondedCount = guests.filter(g => g.responded).length;
      const guestTypeCounts = {
        EMPLOYEE: guests.filter(g => g.guestType === 'EMPLOYEE').length,
        REGULAR: guests.filter(g => g.guestType === 'REGULAR').length,
        VIP: guests.filter(g => g.guestType === 'VIP').length,
        PLUSONE: guests.filter(g => g.guestType === 'PLUSONE').length,
      };

      setStats({
        willAttendCount,
        checkedInCount,
        notCheckedInCount,
        respondedCount,
        guestTypeCounts,
      });

      // Pie Chart
      if (pieChartRef.current) {
        pieChartRef.current.destroy();
      }
      pieChartRef.current = new Chart(document.getElementById('pieChart'), {
        type: 'pie',
        data: {
          labels: [t('checkedIn'), t('notCheckedIn')],
          datasets: [{
            data: [checkedInCount, notCheckedInCount],
            backgroundColor: ['#ff4500', '#808080'],
            borderColor: ['#ff6347', '#a9a9a9'],
            borderWidth: 2,
          }],
        },
        options: {
          plugins: {
            datalabels: {
              color: '#ffffff',
              formatter: (value, ctx) => {
                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                return total > 0 ? `${((value / total) * 100).toFixed(1)}%` : '0%';
              },
              font: { weight: 'bold', size: 14 },
              anchor: 'end',
              align: 'start',
            },
          },
          maintainAspectRatio: false,
          responsive: true,
          devicePixelRatio: 2,
          elements: {
            arc: {
              borderWidth: 4,
              shadowOffsetX: 10,
              shadowOffsetY: 10,
              shadowBlur: 20,
              shadowColor: 'rgba(0, 0, 0, 0.7)',
            },
          },
        },
        plugins: [ChartDataLabels],
      });

      // Bar Chart
      if (barChartRef.current) {
        barChartRef.current.destroy();
      }
      barChartRef.current = new Chart(document.getElementById('barChart'), {
        type: 'bar',
        data: {
          labels: [t('employee'), t('regular'), t('vip'), t('plusone')],
          datasets: [{
            label: t('guestTypeDistribution'),
            data: [
              guestTypeCounts.EMPLOYEE,
              guestTypeCounts.REGULAR,
              guestTypeCounts.VIP,
              guestTypeCounts.PLUSONE,
            ],
            backgroundColor: ['#f97316', '#10b981', '#3b82f6', '#6b7280'],
            borderColor: ['#e94e1b', '#059669', '#2563eb', '#4a4a4a'],
            borderWidth: 2,
          }],
        },
        options: {
          plugins: {
            datalabels: {
              color: '#ffffff',
              formatter: (value) => `${value}`,
              font: { weight: 'bold', size: 12 },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              title: { display: true, text: t('numberOfGuests'), color: '#ffffff' },
              grid: { color: '#444444' },
            },
            x: {
              title: { display: true, text: t('guestType'), color: '#ffffff' },
              grid: { color: '#444444' },
            },
          },
          maintainAspectRatio: false,
          responsive: true,
          elements: {
            bar: {
              borderWidth: 2,
              shadowOffsetX: 5,
              shadowOffsetY: 5,
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
        },
        plugins: [ChartDataLabels],
      });

      // Line Chart
      const hourlyData = Array(24).fill(0);
      if (guests && guests.length > 0) {
        guests.forEach(g => {
          if (g.isCheckedIn && g.checkInTime) {
            const hour = new Date(g.checkInTime).getHours();
            hourlyData[hour]++;
          }
        });
      }
      if (lineChartRef.current) {
        lineChartRef.current.destroy();
      }
      lineChartRef.current = new Chart(document.getElementById('lineChart'), {
        type: 'line',
        data: {
          labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
          datasets: [{
            label: t('checkIns'),
            data: hourlyData,
            borderColor: '#f97316',
            backgroundColor: 'rgba(249, 115, 22, 0.3)',
            fill: true,
            pointStyle: 'circle',
            pointRadius: 6,
            pointHoverRadius: 8,
            pointBackgroundColor: '#e94e1b',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
          }],
        },
        options: {
          scales: {
            y: {
              beginAtZero: true,
              title: { display: true, text: t('numberOfCheckIns'), color: '#ffffff' },
              grid: { color: '#444444' },
            },
            x: {
              title: { display: true, text: t('hour'), color: '#ffffff' },
              grid: { color: '#444444' },
            },
          },
          maintainAspectRatio: false,
          responsive: true,
          plugins: {
            legend: { labels: { color: '#ffffff' } },
          },
          elements: {
            line: {
              borderWidth: 4,
              shadowOffsetX: 3,
              shadowOffsetY: 3,
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
            point: {
              radius: 6,
              hoverRadius: 8,
              shadowOffsetX: 3,
              shadowOffsetY: 3,
              shadowBlur: 8,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
        },
      });

      // Donut Chart
      if (donutChartRef.current) {
        donutChartRef.current.destroy();
      }
      donutChartRef.current = new Chart(document.getElementById('donutChart'), {
        type: 'doughnut',
        data: {
          labels: [t('responded'), t('notResponded')],
          datasets: [{
            data: [respondedCount, guests.length - respondedCount],
            backgroundColor: ['#ff69b4', '#4682b4'],
            borderColor: ['#ff1493', '#4169e1'],
            borderWidth: 2,
          }],
        },
        options: {
          plugins: {
            datalabels: {
              color: '#ffffff',
              formatter: (value, ctx) => {
                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                return total > 0 ? `${((value / total) * 100).toFixed(1)}%` : '0%';
              },
              font: { weight: 'bold', size: 14 },
              anchor: 'end',
              align: 'start',
            },
          },
          maintainAspectRatio: false,
          responsive: true,
          cutout: '50%',
          elements: {
            arc: {
              borderWidth: 4,
              shadowOffsetX: 10,
              shadowOffsetY: 10,
              shadowBlur: 20,
              shadowColor: 'rgba(0, 0, 0, 0.7)',
            },
          },
        },
        plugins: [ChartDataLabels],
      });
    }

    return () => {
      if (pieChartRef.current) {
        pieChartRef.current.destroy();
        pieChartRef.current = null;
      }
      if (barChartRef.current) {
        barChartRef.current.destroy();
        barChartRef.current = null;
      }
      if (lineChartRef.current) {
        lineChartRef.current.destroy();
        lineChartRef.current = null;
      }
      if (donutChartRef.current) {
        donutChartRef.current.destroy();
        donutChartRef.current = null;
      }
    };
  }, [isOpen, guests, t, setStats, pieChartRef, barChartRef, lineChartRef, donutChartRef]);

  if (!isOpen) return null;

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-xl">
        <div className="modal-content bg-dark text-light" style={{ backgroundColor: '#000000', opacity: 1 }}>
          <div className="modal-header border-0">
            <h5 className="modal-title">{t('participantReport')}</h5>
            <div>
              <button
                type="button"
                className="btn btn-canada me-2"
                onClick={handleExportToPDF}
              >
                {t('exportToPDF')}
              </button>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={onClose}
              ></button>
            </div>
          </div>
          <div className="modal-body" ref={reportRef} style={{ backgroundColor: '#000000', opacity: 1 }}>
            <div className="report-section">
              <h6>{t('statistics')}</h6>
              <table className="table table-dark table-striped table-3d">
                <thead>
                  <tr>
                    <th>{t('metric')}</th>
                    <th>{t('value')}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{t('totalParticipants')}</td>
                    <td>{guests.length}</td>
                  </tr>
                  <tr>
                    <td>{t('willAttendCount')}</td>
                    <td>{stats.willAttendCount}</td>
                  </tr>
                  <tr>
                    <td>{t('checkedIn')}</td>
                    <td>{stats.checkedInCount}</td>
                  </tr>
                  <tr>
                    <td>{t('notCheckedIn')}</td>
                    <td>{stats.notCheckedInCount}</td>
                  </tr>
                  <tr>
                    <td>{t('rsvpResponseRate')}</td>
                    <td>{guests.length > 0 ? ((stats.respondedCount / guests.length) * 100).toFixed(1) + '%' : '0%'}</td>
                  </tr>
                  <tr>
                    <td>{t('employeeCount')}</td>
                    <td>{stats.guestTypeCounts.EMPLOYEE}</td>
                  </tr>
                  <tr>
                    <td>{t('regularCount')}</td>
                    <td>{stats.guestTypeCounts.REGULAR}</td>
                  </tr>
                  <tr>
                    <td>{t('vipCount')}</td>
                    <td>{stats.guestTypeCounts.VIP}</td>
                  </tr>
                  <tr>
                    <td>{t('plusOneCount')}</td>
                    <td>{stats.guestTypeCounts.PLUSONE}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="report-section">
              <h6>{t('checkInPieChart')}</h6>
              <div style={{ height: '300px' }} className="chart-container">
                <canvas id="pieChart"></canvas>
              </div>
              <p className="text-light mt-2">{t('checkInPieChartDescription')}</p>
            </div>
            <div className="report-section">
              <h6>{t('guestTypeDistribution')}</h6>
              <div style={{ height: '300px' }} className="chart-container">
                <canvas id="barChart"></canvas>
              </div>
              <p className="text-light mt-2">{t('guestTypeDistributionDescription')}</p>
            </div>
            <div className="report-section">
              <h6>{t('checkInTimeGraph')}</h6>
              <div style={{ height: '300px' }} className="chart-container">
                <canvas id="lineChart"></canvas>
              </div>
              <p className="text-light mt-2">{t('checkInTimeGraphDescription')}</p>
            </div>
            <div className="report-section">
              <h6>{t('rsvpResponseChart')}</h6>
              <div style={{ height: '300px' }} className="chart-container">
                <canvas id="donutChart"></canvas>
              </div>
              <p className="text-light mt-2">{t('rsvpResponseChartDescription')}</p>
            </div>
            <div className="report-section">
              <h6>{t('participantList')}</h6>
              <div className="table-responsive">
                <table className="table table-dark table-striped table-3d">
                  <thead>
                    <tr>
                      <th>{t('firstName')}</th>
                      <th>{t('lastName')}</th>
                      <th>{t('email')}</th>
                      <th>{t('qrId')}</th>
                      <th>{t('guestType')}</th>
                      <th>{t('willAttend')}</th>
                      <th>{t('isCheckedIn')}</th>
                      <th>{t('checkInTime')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guests.map((guest) => (
                      <tr key={guest._id}>
                        <td>{guest.firstName}</td>
                        <td>{guest.lastName}</td>
                        <td>{guest.email}</td>
                        <td>{guest.qrId}</td>
                        <td>{guest.guestType}</td>
                        <td>{guest.willAttend ? t('yes') : t('no')}</td>
                        <td>{guest.isCheckedIn ? t('yes') : t('no')}</td>
                        <td>
                          {guest.checkInTime
                            ? new Date(guest.checkInTime).toLocaleString()
                            : t('none')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParticipantsReport;