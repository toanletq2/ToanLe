
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const estimateDeviceValue = async (brand: string, model: string, condition: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Bạn là chuyên gia định giá điện thoại cũ tại thị trường Việt Nam.
      Yêu cầu: Cung cấp thông tin ngắn gọn về Giá bán nhanh máy cũ tại thị trường việt nam là bao nhiêu, và mức cầm đồ an toàn gợi ý (60~70%) cho thiết bị: ${brand} ${model}, tình trạng: "${condition}".
      Trả về kết quả dưới dạng JSON nghiêm ngặt.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            marketValue: { type: Type.NUMBER, description: "Giá bán nhanh dự kiến tại Việt Nam (VND)" },
            suggestedLoan: { type: Type.NUMBER, description: "Mức cầm đồ an toàn gợi ý 60-70% (VND)" },
            riskLevel: { type: Type.STRING, description: "Mức độ rủi ro: Thấp, Trung bình, Cao" },
            advice: { type: Type.STRING, description: "Thông tin ngắn gọn về giá và lời khuyên" }
          },
          required: ["marketValue", "suggestedLoan", "riskLevel", "advice"]
        }
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Error estimating value:", error);
    return null;
  }
};
