export type Language = 'en' | 'vi';

export const translations = {
    en: {
        // General
        settings: 'Settings',
        general: 'General',
        language: 'Language',
        darkMode: 'Dark Mode',
        autoDetectTimezone: 'Auto-detect Timezone',

        // Scanning
        scanning: 'Scanning',
        autoScanFrequency: 'Auto-scan Frequency',
        every6Hours: 'Every 6 hours',
        requestSpeed: 'Request Speed',
        safe: 'SAFE',
        balanced: 'BALANCED',
        fast: 'FAST',
        concurrentRequests: 'Concurrent Requests',
        simultaneousScans: 'Simultaneous account scans',

        // Notifications
        notifications: 'Notifications',
        pushNotifications: 'Push Notifications',
        newFollowerAlerts: 'New Follower Alerts',
        lostFollowerAlerts: 'Lost Follower Alerts',

        // Navigation
        dashboard: 'Dashboard',
        history: 'History',
        accounts: 'Accounts',

        // Dashboard
        followers: 'Followers',
        following: 'Following',
        mutualFriends: 'Mutual friends',
        lostFollowers: 'Lost followers',
        newFollowers: 'New followers',
        notFollowingBack: 'Not following back',
        quickActions: 'Quick Actions',
        seeAll: 'See All',
        profileEngagement: 'Profile Engagement',
        analyzeReach: 'Analyze your recent post reach',
        ghostFollowers: 'Ghost Followers',
        findInactive: 'Find inactive accounts',
        autoScan: 'Auto Scan',
        scanningBtn: 'Scanning...',
        launching: 'Launching...',
        ready: 'Ready',
        lastUpdated: 'Last updated',
        noDataYet: 'No data yet',
        enterUsername: 'Enter Instagram Username (e.g., cristiano)',
        recent: 'Recent',
        clear: 'Clear',

        // Stats
        followerStats: 'Follower Stats',
        view: 'View',
        mutual: 'Mutual',
        lost: 'Lost',
        new: 'New',
        notFollowing: 'Not Following Back',

        // History
        scanHistory: 'Scan History',
        clearHistory: 'Clear History',
        noHistory: 'No scan history yet',
        viewReport: 'View Report',
        scanned: 'scanned',

        // Settings
        appSettings: 'APP SETTINGS',
        logOut: 'Log Out',
        version: 'Version',

        // Footer
        madeWithLove: 'Made with ❤️ for Instagram users',
        poweredBy: 'Powered by DoHaiDang'
    },
    vi: {
        // General
        settings: 'Cài đặt',
        general: 'Chung',
        language: 'Ngôn ngữ',
        darkMode: 'Chế độ tối',
        autoDetectTimezone: 'Tự động múi giờ',

        // Scanning
        scanning: 'Quét dữ liệu',
        autoScanFrequency: 'Tần suất quét tự động',
        every6Hours: 'Mỗi 6 giờ',
        requestSpeed: 'Tốc độ yêu cầu',
        safe: 'AN TOÀN',
        balanced: 'CÂN BẰNG',
        fast: 'NHANH',
        concurrentRequests: 'Số luồng quét',
        simultaneousScans: 'Quét nhiều tài khoản cùng lúc',

        // Notifications
        notifications: 'Thông báo',
        pushNotifications: 'Thông báo đẩy',
        newFollowerAlerts: 'Cảnh báo người theo dõi mới',
        lostFollowerAlerts: 'Cảnh báo mất người theo dõi',

        // Navigation
        dashboard: 'Trang chủ',
        history: 'Lịch sử',
        accounts: 'Tài khoản',

        // Dashboard
        followers: 'Người theo dõi',
        following: 'Đang theo dõi',
        mutualFriends: 'Bạn bè chung',
        lostFollowers: 'Hủy theo dõi',
        newFollowers: 'Follower mới',
        notFollowingBack: 'Không follow lại',
        quickActions: 'Tác vụ nhanh',
        seeAll: 'Xem tất cả',
        profileEngagement: 'Tương tác Profile',
        analyzeReach: 'Phân tích lượt tiếp cận bài viết',
        ghostFollowers: 'Follower ảo',
        findInactive: 'Tìm tài khoản không tương tác',
        autoScan: 'Quét tự động',
        scanningBtn: 'Đang quét...',
        launching: 'Đang khởi chạy...',
        ready: 'Sẵn sàng',
        lastUpdated: 'Cập nhật lần cuối',
        noDataYet: 'Chưa có dữ liệu',
        enterUsername: 'Nhập Instagram Username (vd: cristiano)',
        recent: 'Gần đây',
        clear: 'Xóa',

        // Stats
        followerStats: 'Thống kê Follower',
        view: 'Xem',
        mutual: 'Bạn chung',
        lost: 'Đã mất',
        new: 'Mới',
        notFollowing: 'Không follow lại',

        // History
        scanHistory: 'Lịch sử quét',
        clearHistory: 'Xóa lịch sử',
        noHistory: 'Chưa có lịch sử quét',
        viewReport: 'Xem báo cáo',
        scanned: 'đã quét',

        // Settings
        appSettings: 'CÀI ĐẶT ỨNG DỤNG',
        logOut: 'Đăng xuất',
        version: 'Phiên bản',

        // Footer
        madeWithLove: 'Được làm bằng ❤️ cho người dùng Instagram',
        poweredBy: 'Phát triển bởi DoHaiDang'
    }
};

export type TranslationKey = keyof typeof translations.en;
