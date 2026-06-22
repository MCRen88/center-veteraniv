export interface RegistryItem {
  id: number;
  name: string;
  title: string;
  cert: string;
  date: string;
}

export const initialRegistryData: RegistryItem[] = [
  { id: 1, name: "Коваленко Олена Петрівна", title: "Фахівець із супроводу", cert: "СС 12345678/000001-26", date: "15.01.2026" },
  { id: 2, name: "Шевченко Ігор Вікторович", title: "Фахівець II категорії", cert: "СС 12345678/000002-26", date: "22.02.2026" },
  { id: 3, name: "Мельник Наталія Сергіївна", title: "Фахівець I категорії", cert: "СС 12345678/000003-26", date: "10.03.2026" },
  { id: 4, name: "Бондаренко Андрій Олександрович", title: "Провідний фахівець", cert: "СС 12345678/000004-26", date: "05.04.2026" },
  { id: 5, name: "Ткаченко Марія Іванівна", title: "Фахівець із супроводу", cert: "СС 12345678/000005-26", date: "20.05.2026" }
];
