import { useState, useEffect } from 'react';

interface DoNotDisturbSettings {
  enabled: boolean;
  startTime: string;
  endTime: string;
  days: string[]; // ['0', '1', '2', '3', '4', '5', '6'] (0=일요일)
}

interface CategorySettings {
  enabled: boolean;
  settings?: Record<string, unknown>; // 세부 설정은 나중에 타입 정의
}

interface NotificationSettings {
  id?: string;
  doNotDisturb: DoNotDisturbSettings;
  newGamePost: CategorySettings;
  participatingGame: CategorySettings;
  myGamePost: CategorySettings;
  waitingList: CategorySettings;
  updatedAt?: string;
}

export function useNotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings>({
    doNotDisturb: {
      enabled: false,
      startTime: "22:00",
      endTime: "08:00",
      days: ["0", "1", "2", "3", "4", "5", "6"]
    },
    newGamePost: { enabled: true },
    participatingGame: { enabled: true },
    myGamePost: { enabled: true },
    waitingList: { enabled: true }
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 알림 설정 조회
  const fetchSettings = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/notifications/settings');
      const data = await response.json();
      
      if (data.success) {
        setSettings(data.settings);
      } else {
        setError(data.error || '알림 설정을 불러오는데 실패했습니다.');
      }
    } catch (err) {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 알림 설정 업데이트
  const updateSettings = async (newSettings: Partial<NotificationSettings>) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/notifications/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSettings),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSettings(data.settings);
        return { success: true };
      } else {
        setError(data.error || '알림 설정 업데이트에 실패했습니다.');
        return { success: false, error: data.error };
      }
    } catch (err) {
      const errorMessage = '네트워크 오류가 발생했습니다.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // 방해 금지 시간 업데이트
  const updateDoNotDisturb = async (doNotDisturbSettings: DoNotDisturbSettings) => {
    return updateSettings({ doNotDisturb: doNotDisturbSettings });
  };

  // 신규 게임메이트 글 알림 설정 업데이트
  const updateNewGamePost = async (enabled: boolean, detailSettings?: Record<string, unknown>) => {
    return updateSettings({ 
      newGamePost: { 
        enabled, 
        settings: detailSettings 
      } 
    });
  };

  // 참여중인 모임 알림 설정 업데이트
  const updateParticipatingGame = async (enabled: boolean, detailSettings?: Record<string, unknown>) => {
    return updateSettings({ 
      participatingGame: { 
        enabled, 
        settings: detailSettings 
      } 
    });
  };

  // 내가 작성한 모임 알림 설정 업데이트
  const updateMyGamePost = async (enabled: boolean, detailSettings?: Record<string, unknown>) => {
    return updateSettings({ 
      myGamePost: { 
        enabled, 
        settings: detailSettings 
      } 
    });
  };

  // 예비 참여 알림 설정 업데이트
  const updateWaitingList = async (enabled: boolean) => {
    return updateSettings({ 
      waitingList: { enabled } 
    });
  };

  // 특정 카테고리 토글
  const toggleCategory = async (category: 'newGamePost' | 'participatingGame' | 'myGamePost' | 'waitingList') => {
    const currentEnabled = settings[category].enabled;
    
    switch (category) {
      case 'newGamePost':
        return updateNewGamePost(!currentEnabled, settings[category].settings);
      case 'participatingGame':
        return updateParticipatingGame(!currentEnabled, settings[category].settings);
      case 'myGamePost':
        return updateMyGamePost(!currentEnabled, settings[category].settings);
      case 'waitingList':
        return updateWaitingList(!currentEnabled);
    }
  };

  // 방해 금지 시간 토글
  const toggleDoNotDisturb = async () => {
    const newDoNotDisturb = {
      ...settings.doNotDisturb,
      enabled: !settings.doNotDisturb.enabled
    };
    return updateDoNotDisturb(newDoNotDisturb);
  };


  // 현재 시간이 방해 금지 시간인지 확인
  const isDoNotDisturbTime = () => {
    if (!settings.doNotDisturb.enabled) return false;
    
    const now = new Date();
    const currentDay = now.getDay().toString(); // 0=일요일
    const currentTime = now.toTimeString().slice(0, 5); // "HH:MM" 형식
    
    // 설정된 요일인지 확인
    if (!settings.doNotDisturb.days.includes(currentDay)) return false;
    
    const startTime = settings.doNotDisturb.startTime;
    const endTime = settings.doNotDisturb.endTime;
    
    // 시간 비교 (자정을 넘나드는 경우 고려)
    if (startTime <= endTime) {
      // 같은 날 내에서의 시간 범위
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // 자정을 넘나드는 경우
      return currentTime >= startTime || currentTime <= endTime;
    }
  };

  // 컴포넌트 마운트 시 설정 로드
  useEffect(() => {
    fetchSettings();
  }, []);

  return {
    settings,
    isLoading,
    error,
    updateSettings,
    updateDoNotDisturb,
    updateNewGamePost,
    updateParticipatingGame,
    updateMyGamePost,
    updateWaitingList,
    toggleCategory,
    toggleDoNotDisturb,
    isDoNotDisturbTime,
    refetch: fetchSettings,
  };
}

