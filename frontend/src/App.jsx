import { Component, Suspense, lazy, useState } from "react";
import {
  Alert,
  Avatar,
  Breadcrumb,
  Button,
  ConfigProvider,
  Drawer,
  Dropdown,
  Layout,
  Menu,
  Result,
  Space,
  Typography,
  theme,
  App as AntApp,
} from "antd";
import viVN from "antd/locale/vi_VN";
import {
  ApartmentOutlined,
  AppstoreOutlined,
  AuditOutlined,
  BranchesOutlined,
  DashboardOutlined,
  FileSearchOutlined,
  LockOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  RiseOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  ShoppingOutlined,
  TeamOutlined,
  UserOutlined,
  UsergroupAddOutlined,
} from "@ant-design/icons";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthProvider";
import { useAction, useMedia } from "./lib/hooks";
import { assetURL } from "./lib/api";
import { AccessDenied, Guard, LoadingPage, roleLabels } from "./ui/common";
import {
  LoginScreen,
  RegisterScreen,
  ResetScreen,
} from "./screens/AuthScreens";
import { PasswordModal, ProfileDrawer } from "./ui/Profile";
import Notifications from "./ui/Notifications";
const Dashboard = lazy(() => import("./screens/Dashboard"));
const Customers = lazy(() => import("./screens/Customers"));
const Leads = lazy(() => import("./screens/Leads"));
const PublicLeadForm = lazy(() => import("./screens/PublicLeadForm"));
const Quotes = lazy(() => import("./screens/Quotes"));
const Pipeline = lazy(() => import("./screens/Pipeline"));
const Catalogs = lazy(() => import("./screens/Catalogs"));
const Organization = lazy(() => import("./screens/Organization"));
const Users = lazy(() => import("./screens/Users"));
const Audit = lazy(() => import("./screens/Audit"));
const Campaigns = lazy(() => import("./screens/Campaigns"));
const Permissions = lazy(() => import("./screens/Permissions"));
const routes = [
  {
    key: "/",
    title: "Tổng quan",
    module: "REPORT",
    icon: DashboardOutlined,
    group: "LÀM VIỆC",
  },
  {
    key: "/customers",
    title: "Khách hàng & liên hệ",
    module: "CUSTOMER",
    icon: UsergroupAddOutlined,
    group: "KINH DOANH",
  },
  {
    key: "/leads",
    title: "Lead & phân bổ",
    module: "LEAD",
    icon: FileSearchOutlined,
    group: "KINH DOANH",
  },
  {
    key: "/campaigns",
    title: "Chiến dịch marketing",
    module: "LEAD",
    roles: ["Admin", "Director", "Marketing"],
    icon: RiseOutlined,
    group: "KINH DOANH",
  },
  {
    key: "/pipeline",
    title: "Cơ hội & pipeline",
    module: "DEAL",
    icon: BranchesOutlined,
    group: "KINH DOANH",
  },
  {
    key: "/quotes",
    title: "Báo giá nháp",
    module: "QUOTE",
    icon: FileSearchOutlined,
    group: "KINH DOANH",
  },
  {
    key: "/products",
    title: "Sản phẩm & bảng giá",
    module: "CATEGORY",
    icon: ShoppingOutlined,
    group: "DANH MỤC & TỔ CHỨC",
  },
  {
    key: "/categories",
    title: "Danh mục bán hàng",
    module: "CATEGORY",
    icon: AppstoreOutlined,
    group: "DANH MỤC & TỔ CHỨC",
  },
  {
    key: "/deal-reasons",
    title: "Lý do & đối thủ",
    module: "CATEGORY",
    icon: FileSearchOutlined,
    group: "DANH MỤC & TỔ CHỨC",
  },
  {
    key: "/organization",
    title: "Cơ cấu tổ chức",
    module: "CATEGORY",
    icon: ApartmentOutlined,
    group: "DANH MỤC & TỔ CHỨC",
  },
  {
    key: "/users",
    title: "Quản trị người dùng",
    module: "USER_LOG",
    roles: ["Admin", "Director"],
    icon: TeamOutlined,
    group: "QUẢN TRỊ",
  },
  {
    key: "/custom-fields",
    title: "Trường tùy chỉnh",
    module: "CATEGORY",
    icon: SettingOutlined,
    group: "QUẢN TRỊ",
  },
  {
    key: "/permission-matrix",
    title: "Ma trận phân quyền",
    module: "USER_LOG",
    icon: SafetyCertificateOutlined,
    group: "QUẢN TRỊ",
  },
  {
    key: "/audit-logs",
    title: "Nhật ký thay đổi",
    module: "USER_LOG",
    icon: AuditOutlined,
    group: "QUẢN TRỊ",
  },
];
class ErrorBoundary extends Component {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <Result
        status="500"
        title="Trang chưa hiển thị được"
        subTitle="Vui lòng tải lại trang. Dữ liệu đã lưu vẫn được giữ nguyên."
        extra={
          <Button type="primary" onClick={() => window.location.reload()}>
            Tải lại trang
          </Button>
        }
      />
    ) : (
      this.props.children
    );
  }
}
function Workspace() {
  const auth = useAuth(),
    location = useLocation(),
    nav = useNavigate(),
    action = useAction(),
    mobile = useMedia("(max-width: 991px)");
  const [collapsed, setCollapsed] = useState(false),
    [navOpen, setNavOpen] = useState(false),
    [profile, setProfile] = useState(false),
    [password, setPassword] = useState(false),
    [accountOpen, setAccountOpen] = useState(false);
  const allowed = routes.filter(
    (r) => auth.can(r.module) && (!r.roles || auth.has(...r.roles)),
  );
  const selected = routes.find((r) => r.key === location.pathname);
  const grouped = [...new Set(allowed.map((r) => r.group))].map((group) => ({
    type: "group",
    label: group,
    children: allowed
      .filter((r) => r.group === group)
      .map((r) => ({
        key: r.key,
        label: r.title,
        icon: <r.icon aria-hidden="true" />,
      })),
  }));
  const navigation = (
    <>
      <button
        className="brand brand-button"
        onClick={() => {
          nav("/");
          setNavOpen(false);
        }}
        aria-label="Enterprise CRM · Tổng quan"
      >
        <span className="brand-mark">
          <ApartmentOutlined aria-hidden="true" />
        </span>
        {(!collapsed || mobile) && (
          <span>
            Enterprise <b>CRM</b>
          </span>
        )}
      </button>
      <Menu
        mode="inline"
        items={grouped}
        selectedKeys={[location.pathname]}
        onClick={({ key }) => {
          nav(key);
          setNavOpen(false);
        }}
      />
      <div className="sidebar-footer">
        {(!collapsed || mobile) && (
          <>
            <span className="eyebrow">PHẠM VI ĐƯỢC CẤP</span>
            <Typography.Text ellipsis>
              {auth.user.group?.name || "Theo vai trò của bạn"}
            </Typography.Text>
          </>
        )}
        <span className="workspace-status">
          <span />
          Đã kết nối
        </span>
      </div>
    </>
  );
  return (
    <Layout className="app-layout">
      {mobile ? (
        <Drawer
          placement="left"
          open={navOpen}
          onClose={() => setNavOpen(false)}
          size={280}
          className="mobile-nav"
          closable={false}
        >
          {navigation}
        </Drawer>
      ) : (
        <Layout.Sider
          theme="light"
          width={260}
          collapsedWidth={80}
          collapsed={collapsed}
          className="app-sider"
        >
          {navigation}
        </Layout.Sider>
      )}
      <Layout className="workspace-main">
        <Layout.Header className="app-header">
          <div className="header-left">
            <Button
              type="text"
              aria-label={
                mobile
                  ? "Mở điều hướng"
                  : collapsed
                    ? "Mở rộng điều hướng"
                    : "Thu gọn điều hướng"
              }
              icon={
                collapsed || mobile ? (
                  <MenuUnfoldOutlined aria-hidden="true" />
                ) : (
                  <MenuFoldOutlined aria-hidden="true" />
                )
              }
              onClick={() =>
                mobile ? setNavOpen(true) : setCollapsed(!collapsed)
              }
            />
            <Breadcrumb
              className="header-breadcrumb"
              items={[
                { title: "Không gian làm việc" },
                { title: selected?.title || "Trang" },
              ]}
            />
          </div>
          <Space size={12}>
            {auth.can("AUTO") && <Notifications />}
            <Dropdown
              open={accountOpen}
              onOpenChange={setAccountOpen}
              getPopupContainer={() => document.body}
              trigger={["click"]}
              menu={{
                items: [
                  {
                    key: "profile",
                    label: "Hồ sơ cá nhân",
                    icon: <UserOutlined aria-hidden="true" />,
                  },
                  {
                    key: "password",
                    label: "Đổi mật khẩu",
                    icon: <LockOutlined aria-hidden="true" />,
                  },
                  { type: "divider" },
                  {
                    key: "logout",
                    label: "Đăng xuất",
                    icon: <LogoutOutlined aria-hidden="true" />,
                    danger: true,
                  },
                ],
                onClick: ({ key }) => {
                  setAccountOpen(false);
                  if (key === "profile") setProfile(true);
                  if (key === "password") setPassword(true);
                  if (key === "logout")
                    action.run(
                      () => auth.logout(),
                      () => nav("/login"),
                      null,
                    );
                },
              }}
            >
              <button
                type="button"
                className="user-menu"
                aria-label="Tài khoản của tôi"
                aria-haspopup="menu"
                aria-expanded={accountOpen}
                onClick={() => setAccountOpen(!accountOpen)}
              >
                <Avatar
                  src={assetURL(auth.user.avatar)}
                  icon={<UserOutlined aria-hidden="true" />}
                />
                <div>
                  <Typography.Text strong>
                    {auth.user.full_name}
                  </Typography.Text>
                  <span>
                    {auth.user.roles.length > 1
                      ? `${auth.user.roles.length} vai trò`
                      : roleLabels[auth.user.roles[0]]}
                  </span>
                </div>
              </button>
            </Dropdown>
          </Space>
        </Layout.Header>
        <Layout.Content className="app-content">
          <ErrorBoundary>
            <div key={location.pathname} className="page-enter">
              {auth.user.must_change_password && (
                <Alert
                  showIcon
                  type="warning"
                  title="Bạn đang sử dụng mật khẩu tạm."
                  description={
                    <Button type="link" onClick={() => setPassword(true)}>
                      Đặt mật khẩu riêng cho tài khoản
                    </Button>
                  }
                  className="section-gap"
                />
              )}
              <Suspense fallback={<LoadingPage />}>
                <Routes>
                  <Route
                    path="/"
                    element={
                      <Guard module="REPORT">
                        <Dashboard />
                      </Guard>
                    }
                  />
                  <Route
                    path="/customers"
                    element={
                      <Guard module="CUSTOMER">
                        <Customers />
                      </Guard>
                    }
                  />
                  <Route
                    path="/leads"
                    element={
                      <Guard module="LEAD">
                        <Leads />
                      </Guard>
                    }
                  />
                  <Route
                    path="/campaigns"
                    element={
                      <Guard
                        module="LEAD"
                        roles={["Admin", "Director", "Marketing"]}
                      >
                        <Campaigns />
                      </Guard>
                    }
                  />
                  <Route
                    path="/pipeline"
                    element={
                      <Guard module="DEAL">
                        <Pipeline />
                      </Guard>
                    }
                  />
                  {[
                    "products",
                    "categories",
                    "deal-reasons",
                    "custom-fields",
                  ].map((page) => (
                    <Route
                      key={page}
                      path={"/" + page}
                      element={
                        <Guard module="CATEGORY">
                          <Catalogs kind={page} />
                        </Guard>
                      }
                    />
                  ))}
                  <Route
                    path="/quotes"
                    element={
                      <Guard module="QUOTE">
                        <Quotes />
                      </Guard>
                    }
                  />
                  <Route
                    path="/organization"
                    element={
                      <Guard module="CATEGORY">
                        <Organization />
                      </Guard>
                    }
                  />
                  <Route
                    path="/users"
                    element={
                      <Guard module="USER_LOG" roles={["Admin", "Director"]}>
                        <Users />
                      </Guard>
                    }
                  />
                  <Route
                    path="/audit-logs"
                    element={
                      <Guard module="USER_LOG">
                        <Audit />
                      </Guard>
                    }
                  />
                  <Route
                    path="/permission-matrix"
                    element={
                      <Guard module="USER_LOG">
                        <Permissions />
                      </Guard>
                    }
                  />
                  <Route
                    path="/sales-org"
                    element={<Navigate to="/organization" replace />}
                  />
                  <Route
                    path="/deals"
                    element={<Navigate to="/pipeline" replace />}
                  />
                  <Route path="/403" element={<AccessDenied />} />
                  <Route
                    path="*"
                    element={
                      <Result
                        status="404"
                        title="Không tìm thấy trang"
                        subTitle="Đường dẫn này không còn tồn tại hoặc đã được thay đổi."
                        extra={
                          <Button type="primary" onClick={() => nav("/")}>
                            Về tổng quan
                          </Button>
                        }
                      />
                    }
                  />
                </Routes>
              </Suspense>
            </div>
          </ErrorBoundary>
          <footer className="app-footer">
            <Typography.Text type="secondary">Enterprise CRM</Typography.Text>
            <Typography.Text type="secondary">
              {auth.user.group?.name || roleLabels[auth.user.roles[0]]}
            </Typography.Text>
          </footer>
        </Layout.Content>
      </Layout>
      <ProfileDrawer open={profile} onClose={() => setProfile(false)} />
      <PasswordModal open={password} onClose={() => setPassword(false)} />
    </Layout>
  );
}
function RouterGate() {
  const auth = useAuth(),
    location = useLocation();
  if (location.pathname.startsWith("/public/lead-forms/"))
    return (
      <Suspense fallback={<LoadingPage />}>
        <PublicLeadForm />
      </Suspense>
    );
  if (auth.loading) return <LoadingPage />;
  if (["/login", "/register", "/reset-password"].includes(location.pathname)) {
    if (auth.user && location.pathname !== "/reset-password")
      return <Navigate to={location.state?.from || "/"} replace />;
    return (
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/register" element={<RegisterScreen />} />
        <Route path="/reset-password" element={<ResetScreen />} />
      </Routes>
    );
  }
  if (!auth.user)
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname + location.search }}
        replace
      />
    );
  return <Workspace />;
}
export default function App() {
  const reduced = useMedia("(prefers-reduced-motion: reduce)");
  return (
    <ConfigProvider
      getPopupContainer={() => document.body}
      locale={viVN}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: "#1677ff",
          colorInfo: "#1677ff",
          colorText: "#172b4d",
          colorTextSecondary: "#64748b",
          colorBgLayout: "#f5f7fb",
          borderRadius: 10,
          fontSize: 14,
          fontFamily:
            'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          motion: !reduced,
          motionDurationFast: "0.12s",
          motionDurationMid: "0.2s",
          motionDurationSlow: "0.28s",
        },
        components: {
          Layout: { headerBg: "#fff", bodyBg: "#f5f7fb" },
          Table: { headerBg: "#f8fafc", cellPaddingBlock: 16 },
          Card: { paddingLG: 24 },
          Button: { controlHeight: 38 },
          Menu: { itemHeight: 42, itemMarginInline: 12, itemBorderRadius: 8 },
        },
      }}
    >
      <AntApp>
        <AuthProvider>
          <RouterGate />
        </AuthProvider>
      </AntApp>
    </ConfigProvider>
  );
}
