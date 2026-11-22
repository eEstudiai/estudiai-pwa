import {Pressable,Text,StyleSheet} from 'react-native';
export function PrimaryButton({title,onPress}:{title:string,onPress:()=>void}){return <Pressable onPress={onPress} style={s.b}><Text style={s.t}>{title}</Text></Pressable>}
const s=StyleSheet.create({b:{backgroundColor:'#111827',padding:16,borderRadius:14,marginVertical:7},t:{color:'white',fontWeight:'700',textAlign:'center',fontSize:16}});
