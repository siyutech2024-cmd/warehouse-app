import { useState, useEffect } from "react";
import { store } from "../store";

export default function AdminEmployees() {
    const [employees, setEmployees] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newEmployee, setNewEmployee] = useState({ username: '', role: 'EMPLOYEE' });

    useEffect(() => {
        loadEmployees();
    }, []);

    const loadEmployees = async () => {
        // 从库存记录中提取员工
        const empMap = {};
        const inventory = await store.getInventory() || [];
        inventory.forEach(item => {
            const emp = item.createdBy || 'unknown';
            if (!empMap[emp]) {
                empMap[emp] = {
                    username: emp,
                    role: emp === 'admin' ? 'ADMIN' : 'EMPLOYEE',
                    recordCount: 0,
                    totalStock: 0,
                    lastActive: null,
                    status: 'active'
                };
            }
            empMap[emp].recordCount++;
            empMap[emp].totalStock += item.stock || 0;
            const itemDate = item.createdAt ? new Date(item.createdAt) : null;
            if (!empMap[emp].lastActive || (itemDate && itemDate > empMap[emp].lastActive)) {
                empMap[emp].lastActive = itemDate;
            }
        });

        // 从 localStorage 获取员工列表
        const storedEmployees = JSON.parse(localStorage.getItem('warehouse_employees') || '[]');
        storedEmployees.forEach(emp => {
            if (!empMap[emp.username]) {
                empMap[emp.username] = {
                    ...emp,
                    recordCount: 0,
                    totalStock: 0,
                    lastActive: null
                };
            } else {
                empMap[emp.username] = { ...empMap[emp.username], ...emp };
            }
        });

        // 确保 admin 存在
        if (!empMap['admin']) {
            empMap['admin'] = {
                username: 'admin',
                role: 'ADMIN',
                recordCount: 0,
                totalStock: 0,
                lastActive: null,
                status: 'active'
            };
        }

        setEmployees(Object.values(empMap));
    };

    const saveEmployees = (emps) => {
        const toSave = emps.map(e => ({
            username: e.username,
            role: e.role,
            status: e.status || 'active'
        }));
        localStorage.setItem('warehouse_employees', JSON.stringify(toSave));
    };

    const addEmployee = () => {
        if (!newEmployee.username.trim()) {
            alert('请输入用户名');
            return;
        }
        if (employees.some(e => e.username === newEmployee.username)) {
            alert('用户名已存在');
            return;
        }

        const updated = [...employees, {
            ...newEmployee,
            recordCount: 0,
            totalStock: 0,
            lastActive: null,
            status: 'active'
        }];
        setEmployees(updated);
        saveEmployees(updated);
        setNewEmployee({ username: '', role: 'EMPLOYEE' });
        setShowAddModal(false);
    };

    const toggleStatus = (username) => {
        if (username === 'admin') {
            alert('不能禁用管理员账号');
            return;
        }
        const updated = employees.map(e =>
            e.username === username
                ? { ...e, status: e.status === 'active' ? 'disabled' : 'active' }
                : e
        );
        setEmployees(updated);
        saveEmployees(updated);
    };

    const deleteEmployee = (username) => {
        if (username === 'admin') {
            alert('不能删除管理员账号');
            return;
        }
        if (!confirm(`确定删除员工 ${username}？`)) return;

        const updated = employees.filter(e => e.username !== username);
        setEmployees(updated);
        saveEmployees(updated);
    };

    return (
        <div className="admin-page">
            <div className="admin-header">
                <h1 className="admin-title">👥 员工管理</h1>
                <p className="admin-subtitle">管理系统用户</p>
            </div>

            {/* 统计 */}
            <div className="stats-row">
                <div className="stat-mini">
                    <span className="stat-mini-value">{employees.length}</span>
                    <span className="stat-mini-label">总员工</span>
                </div>
                <div className="stat-mini">
                    <span className="stat-mini-value">{employees.filter(e => e.role === 'ADMIN').length}</span>
                    <span className="stat-mini-label">管理员</span>
                </div>
                <div className="stat-mini">
                    <span className="stat-mini-value">{employees.filter(e => e.status === 'active').length}</span>
                    <span className="stat-mini-label">活跃账号</span>
                </div>
            </div>

            {/* 工具栏 */}
            <div className="admin-toolbar">
                <div className="toolbar-left"></div>
                <div className="toolbar-right">
                    <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
                        ➕ 添加员工
                    </button>
                </div>
            </div>

            {/* 员工列表 */}
            <div className="admin-card">
                <div className="admin-table-container">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>用户名</th>
                                <th>角色</th>
                                <th>入库记录数</th>
                                <th>入库总量</th>
                                <th>最后活跃</th>
                                <th>状态</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {employees.map((emp) => (
                                <tr key={emp.username} className={emp.status === 'disabled' ? 'row-disabled' : ''}>
                                    <td>
                                        <div className="employee-name">
                                            <span className="employee-avatar">
                                                {emp.role === 'ADMIN' ? '👑' : '👤'}
                                            </span>
                                            {emp.username}
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`role-badge role-${emp.role.toLowerCase()}`}>
                                            {emp.role === 'ADMIN' ? '管理员' : '员工'}
                                        </span>
                                    </td>
                                    <td>{emp.recordCount}</td>
                                    <td>{emp.totalStock.toLocaleString()} 件</td>
                                    <td>
                                        {emp.lastActive
                                            ? new Date(emp.lastActive).toLocaleDateString('zh-CN')
                                            : '-'
                                        }
                                    </td>
                                    <td>
                                        <span className={`status-badge status-${emp.status || 'active'}`}>
                                            {emp.status === 'disabled' ? '已禁用' : '活跃'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            <button
                                                className="btn-icon"
                                                onClick={() => toggleStatus(emp.username)}
                                                title={emp.status === 'disabled' ? '启用' : '禁用'}
                                                disabled={emp.username === 'admin'}
                                            >
                                                {emp.status === 'disabled' ? '✅' : '🚫'}
                                            </button>
                                            <button
                                                className="btn-icon btn-danger"
                                                onClick={() => deleteEmployee(emp.username)}
                                                title="删除"
                                                disabled={emp.username === 'admin'}
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 添加员工弹窗 */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>➕ 添加员工</h3>
                            <button className="modal-close" onClick={() => setShowAddModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">用户名</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={newEmployee.username}
                                    onChange={e => setNewEmployee({ ...newEmployee, username: e.target.value })}
                                    placeholder="输入用户名"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">角色</label>
                                <select
                                    className="form-input"
                                    value={newEmployee.role}
                                    onChange={e => setNewEmployee({ ...newEmployee, role: e.target.value })}
                                >
                                    <option value="EMPLOYEE">员工</option>
                                    <option value="ADMIN">管理员</option>
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>取消</button>
                            <button className="btn btn-primary" onClick={addEmployee}>添加</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
