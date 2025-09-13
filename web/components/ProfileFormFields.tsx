interface ProfileFormFieldsProps {
  name: string;
  setName: (value: string) => void;
  birthDate: string;
  setBirthDate: (value: string) => void;
}

export const ProfileFormFields = ({
  name,
  setName,
  birthDate,
  setBirthDate,
}: ProfileFormFieldsProps) => {
  return (
    <div className="space-y-6">
      {/* 사용자 이름 입력 필드 */}
      <div>
        <label 
          htmlFor="name" 
          className="block text-sm font-medium text-cyber-gray mb-1"
        >
          성명(본명)
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-cyber-black-300 rounded-md shadow-sm focus:outline-none focus:ring-cyber-blue focus:border-cyber-blue bg-cyber-black-100 text-cyber-gray placeholder-cyber-darkgray"
          placeholder="실명을 입력해주세요"
          required
        />
      </div>

      {/* 생년월일 입력 필드 */}
      <div>
        <label 
          htmlFor="birthDate" 
          className="block text-sm font-medium text-cyber-gray mb-1"
        >
          생년월일
        </label>
        <input
          type="date"
          id="birthDate"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          className="w-full px-3 py-2 border border-cyber-black-300 rounded-md shadow-sm focus:outline-none focus:ring-cyber-blue focus:border-cyber-blue bg-cyber-black-100 text-cyber-gray"
          required
        />
      </div>
    </div>
  );
};
