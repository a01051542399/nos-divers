// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<string, ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 */
const MAPPING: IconMapping = {
  "house.fill": "home",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "doc.text.fill": "description",
  "gearshape.fill": "settings",
  "plus.circle.fill": "add-circle",
  "person.2.fill": "group",
  "dollarsign.circle.fill": "attach-money",
  "checkmark.circle.fill": "check-circle",
  "xmark.circle.fill": "cancel",
  "trash.fill": "delete",
  "pencil": "edit",
  "arrow.right": "arrow-forward",
  "calendar": "event",
  "mappin.and.ellipse": "place",
  "water.waves": "pool",
  "pencil.and.list.clipboard": "assignment",
  "doc.on.doc": "content-copy",
  "checkmark.shield.fill": "verified-user",
  "lock.fill": "lock",
};

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: string;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  const iconName = MAPPING[name] || "help-outline";
  return <MaterialIcons color={color} size={size} name={iconName} style={style} />;
}
