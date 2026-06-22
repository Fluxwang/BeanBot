// 主色调
export const ACCENT = '#c8a96e';

// 根据字符串哈希出固定颜色（用于账户图标）
export function hashColor(str) {
  const palette = ['#e9876a','#69a7e8','#7dd87d','#caa46a','#b07de8','#e87d9a','#7dc8e8','#e8c87d'];
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xfffffff;
  return palette[h % palette.length];
}

// 取账户名最后一段作为显示标签，如 Expenses:Food → Food
export function accountLabel(name) {
  return name.split(':').pop();
}
