import { IsString, MaxLength } from 'class-validator';

export class UpdateSessionTitleDto {
  @IsString()
  @MaxLength(255)
  title!: string;
}
